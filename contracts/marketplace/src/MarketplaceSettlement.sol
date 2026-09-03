// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { CollectionStandard } from "./CollectionTypes.sol";

interface IERC2981Settlement {
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address, uint256);
}

contract MarketplaceSettlement is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_PLATFORM_FEE_BPS = 1_000;
    address public constant ETH = address(0);

    enum ListingState {
        ACTIVE,
        CANCELLED,
        SOLD
    }

    struct Listing {
        address seller;
        address collection;
        uint256 tokenId;
        CollectionStandard standard;
        uint256 quantity;
        uint256 unitPrice;
        address currency;
        uint64 expiresAt;
        ListingState state;
    }

    error InvalidAddress();
    error InvalidPrice();
    error InvalidQuantity();
    error InvalidExpiry();
    error UnsupportedCollection();
    error UnsupportedCurrency(address currency);
    error InvalidListingState(uint256 listingId);
    error ListingExpired(uint256 listingId);
    error NotSeller();
    error MissingOwnership();
    error MissingApproval();
    error InvalidPayment();
    error PurchaseAlreadyUsed(bytes32 purchaseId);
    error InvalidPurchaseQuantity();
    error AllocationOverflow();
    error NoPendingBalance();
    error ETHTransferFailed();
    error InvalidFee(uint256 feeBps);

    uint256 public nextListingId = 1;
    uint256 public platformFeeBps;
    address public treasury;
    mapping(address => bool) public allowedCurrencies;
    mapping(uint256 => Listing) private _listings;
    mapping(address => mapping(address => uint256)) private _pending;
    mapping(bytes32 => bool) public usedPurchaseIds;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed collection,
        uint256 tokenId,
        CollectionStandard standard,
        uint256 quantity,
        uint256 unitPrice,
        address currency,
        uint64 expiresAt
    );
    event ListingCancelled(uint256 indexed listingId, address indexed caller);
    event ListingPurchased(
        uint256 indexed listingId,
        bytes32 indexed purchaseId,
        address indexed buyer,
        uint256 quantity,
        uint256 saleAmount,
        uint256 platformFee,
        uint256 royaltyAmount,
        address royaltyRecipient
    );
    event CurrencyUpdated(address indexed currency, bool allowed);
    event PlatformFeeUpdated(uint256 feeBps);
    event TreasuryUpdated(address indexed treasury);
    event PaymentWithdrawn(address indexed payee, address indexed currency, uint256 amount);

    constructor(address initialOwner, address initialTreasury, uint256 initialFeeBps)
        Ownable(initialOwner)
    {
        if (initialTreasury == address(0)) revert InvalidAddress();
        if (initialFeeBps > MAX_PLATFORM_FEE_BPS) revert InvalidFee(initialFeeBps);
        treasury = initialTreasury;
        platformFeeBps = initialFeeBps;
        emit TreasuryUpdated(initialTreasury);
        emit PlatformFeeUpdated(initialFeeBps);
    }

    receive() external payable { }

    function setCurrency(address currency, bool allowed) external onlyOwner {
        if (currency == ETH) revert InvalidAddress();
        allowedCurrencies[currency] = allowed;
        emit CurrencyUpdated(currency, allowed);
    }

    function setPlatformFeeBps(uint256 feeBps) external onlyOwner {
        if (feeBps > MAX_PLATFORM_FEE_BPS) revert InvalidFee(feeBps);
        platformFeeBps = feeBps;
        emit PlatformFeeUpdated(feeBps);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function createListing(
        address collection,
        uint256 tokenId,
        CollectionStandard standard,
        uint256 quantity,
        uint256 unitPrice,
        address currency,
        uint64 expiresAt
    ) external whenNotPaused returns (uint256 listingId) {
        if (msg.sender == address(0) || collection == address(0)) {
            revert InvalidAddress();
        }
        if (unitPrice == 0) revert InvalidPrice();
        if (quantity == 0 || (standard == CollectionStandard.ERC721 && quantity != 1)) {
            revert InvalidQuantity();
        }
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry();
        _validateCurrency(currency);
        _validateCollection(collection, standard);
        _validateSellerAsset(msg.sender, collection, tokenId, standard, quantity);

        listingId = nextListingId++;
        _listings[listingId] = Listing(
            msg.sender,
            collection,
            tokenId,
            standard,
            quantity,
            unitPrice,
            currency,
            expiresAt,
            ListingState.ACTIVE
        );
        emit ListingCreated(
            listingId,
            msg.sender,
            collection,
            tokenId,
            standard,
            quantity,
            unitPrice,
            currency,
            expiresAt
        );
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = _listings[listingId];
        if (listing.seller == address(0)) revert InvalidListingState(listingId);
        if (msg.sender != listing.seller && msg.sender != owner()) revert NotSeller();
        if (listing.state != ListingState.ACTIVE) revert InvalidListingState(listingId);
        listing.state = ListingState.CANCELLED;
        emit ListingCancelled(listingId, msg.sender);
    }

    function purchase(uint256 listingId, bytes32 purchaseId, uint256 quantity)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (usedPurchaseIds[purchaseId]) revert PurchaseAlreadyUsed(purchaseId);
        Listing storage listing = _listings[listingId];
        if (listing.seller == address(0) || listing.state != ListingState.ACTIVE) {
            revert InvalidListingState(listingId);
        }
        if (listing.expiresAt != 0 && block.timestamp >= listing.expiresAt) {
            revert ListingExpired(listingId);
        }
        if (quantity == 0 || quantity > listing.quantity) revert InvalidPurchaseQuantity();
        if (listing.standard == CollectionStandard.ERC721 && quantity != 1) {
            revert InvalidPurchaseQuantity();
        }
        _validateCurrency(listing.currency);
        _validateSellerAsset(
            listing.seller, listing.collection, listing.tokenId, listing.standard, quantity
        );

        uint256 saleAmount = listing.unitPrice * quantity;
        (address royaltyRecipient, uint256 royaltyAmount) =
            IERC2981Settlement(listing.collection).royaltyInfo(listing.tokenId, saleAmount);
        uint256 platformFee = (saleAmount * platformFeeBps) / 10_000;
        if (platformFee + royaltyAmount > saleAmount) revert AllocationOverflow();
        if (royaltyAmount != 0 && royaltyRecipient == address(0)) revert AllocationOverflow();
        uint256 sellerAmount = saleAmount - platformFee - royaltyAmount;

        _collectPayment(listing.currency, saleAmount);
        if (listing.standard == CollectionStandard.ERC721) {
            IERC721(listing.collection)
                .safeTransferFrom(listing.seller, msg.sender, listing.tokenId);
            listing.quantity = 0;
            listing.state = ListingState.SOLD;
        } else {
            IERC1155(listing.collection)
                .safeTransferFrom(listing.seller, msg.sender, listing.tokenId, quantity, "");
            listing.quantity -= quantity;
            if (listing.quantity == 0) listing.state = ListingState.SOLD;
        }
        usedPurchaseIds[purchaseId] = true;
        _pending[listing.currency][listing.seller] += sellerAmount;
        _pending[listing.currency][treasury] += platformFee;
        if (royaltyAmount != 0) {
            _pending[listing.currency][royaltyRecipient] += royaltyAmount;
        }
        emit ListingPurchased(
            listingId,
            purchaseId,
            msg.sender,
            quantity,
            saleAmount,
            platformFee,
            royaltyAmount,
            royaltyRecipient
        );
    }

    function withdraw(address currency) external nonReentrant {
        uint256 amount = _pending[currency][msg.sender];
        if (amount == 0) revert NoPendingBalance();
        _pending[currency][msg.sender] = 0;
        if (currency == ETH) {
            (bool success,) = payable(msg.sender).call{ value: amount }("");
            if (!success) revert ETHTransferFailed();
        } else {
            IERC20(currency).safeTransfer(msg.sender, amount);
        }
        emit PaymentWithdrawn(msg.sender, currency, amount);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    function pendingBalance(address currency, address account) external view returns (uint256) {
        return _pending[currency][account];
    }

    function _validateCurrency(address currency) private view {
        if (currency != ETH && !allowedCurrencies[currency]) revert UnsupportedCurrency(currency);
    }

    function _validateCollection(address collection, CollectionStandard standard) private view {
        bytes4 interfaceId = standard == CollectionStandard.ERC721
            ? type(IERC721).interfaceId
            : type(IERC1155).interfaceId;
        try IERC165(collection).supportsInterface(interfaceId) returns (bool supported) {
            if (!supported) revert UnsupportedCollection();
        } catch {
            revert UnsupportedCollection();
        }
    }

    function _validateSellerAsset(
        address seller,
        address collection,
        uint256 tokenId,
        CollectionStandard standard,
        uint256 quantity
    ) private view {
        if (standard == CollectionStandard.ERC721) {
            try IERC721(collection).ownerOf(tokenId) returns (address currentOwner) {
                if (currentOwner != seller) revert MissingOwnership();
            } catch {
                revert MissingOwnership();
            }
            if (
                IERC721(collection).getApproved(tokenId) != address(this)
                    && !IERC721(collection).isApprovedForAll(seller, address(this))
            ) {
                revert MissingApproval();
            }
        } else {
            if (IERC1155(collection).balanceOf(seller, tokenId) < quantity) {
                revert MissingOwnership();
            }
            if (!IERC1155(collection).isApprovedForAll(seller, address(this))) {
                revert MissingApproval();
            }
        }
    }

    function _collectPayment(address currency, uint256 amount) private {
        if (currency == ETH) {
            if (msg.value != amount) revert InvalidPayment();
        } else {
            if (msg.value != 0) revert InvalidPayment();
            IERC20(currency).safeTransferFrom(msg.sender, address(this), amount);
        }
    }
}
