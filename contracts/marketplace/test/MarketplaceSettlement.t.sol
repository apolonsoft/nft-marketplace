// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { CreatorCollectionFactory } from "../src/CreatorCollectionFactory.sol";
import { CreatorERC721, CreatorERC1155 } from "../src/CreatorCollection.sol";
import { MarketplaceSettlement } from "../src/MarketplaceSettlement.sol";
import { CollectionMetadata, CollectionStandard } from "../src/CollectionTypes.sol";

contract SettlementTestToken is ERC20 {
    constructor() ERC20("Test USD Coin", "tUSDC") { }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MarketplaceSettlementTest is Test {
    CreatorCollectionFactory private factory;
    CreatorERC721 private implementation721;
    CreatorERC1155 private implementation1155;
    MarketplaceSettlement private market;
    SettlementTestToken private usdc;
    CollectionMetadata private metadata = CollectionMetadata(
        "Art", "ART", "ipfs://collection", "desc", "ipfs://image", "https://example.com"
    );
    address private seller = address(0xCAFE);
    address private buyer = address(0xB0B);
    address private royalty = address(0xBEEF);
    address private treasury = address(0xFEE);

    function setUp() external {
        factory = new CreatorCollectionFactory(address(this));
        implementation721 = new CreatorERC721();
        implementation1155 = new CreatorERC1155();
        factory.setImplementation(address(implementation721), CollectionStandard.ERC721, true);
        factory.setImplementation(address(implementation1155), CollectionStandard.ERC1155, true);
        market = new MarketplaceSettlement(address(this), treasury, 250);
        usdc = new SettlementTestToken();
        market.setCurrency(address(usdc), true);
        vm.deal(buyer, 100 ether);
        usdc.mint(buyer, 1_000_000);
    }

    function testETHERC721SettlementAndPullBalances() external {
        CreatorERC721 token = _deploy721();
        vm.prank(seller);
        token.setApprovalForAll(address(market), true);
        vm.prank(seller);
        uint256 listingId = market.createListing(
            address(token), 1, CollectionStandard.ERC721, 1, 1 ether, address(0), 0
        );
        vm.prank(buyer);
        market.purchase{ value: 1 ether }(listingId, bytes32(uint256(1)), 1);
        assertEq(token.ownerOf(1), buyer);
        assertEq(market.pendingBalance(address(0), seller), 0.925 ether);
        assertEq(market.pendingBalance(address(0), treasury), 0.025 ether);
        assertEq(market.pendingBalance(address(0), royalty), 0.05 ether);
        assertEq(
            uint256(market.getListing(listingId).state),
            uint256(MarketplaceSettlement.ListingState.SOLD)
        );
    }

    function testERC1155PartialPurchaseAndExactAllocations() external {
        CreatorERC1155 token = _deploy1155();
        vm.prank(seller);
        token.setApprovalForAll(address(market), true);
        vm.prank(seller);
        uint256 listingId = market.createListing(
            address(token), 7, CollectionStandard.ERC1155, 10, 1e15, address(0), 0
        );
        vm.prank(buyer);
        market.purchase{ value: 3e15 }(listingId, bytes32(uint256(2)), 3);
        assertEq(token.balanceOf(buyer, 7), 3);
        assertEq(market.getListing(listingId).quantity, 7);
        vm.prank(buyer);
        market.purchase{ value: 7e15 }(listingId, bytes32(uint256(3)), 7);
        assertEq(token.balanceOf(buyer, 7), 10);
        assertEq(
            uint256(market.getListing(listingId).state),
            uint256(MarketplaceSettlement.ListingState.SOLD)
        );
        assertEq(
            market.pendingBalance(address(0), seller) + market.pendingBalance(address(0), treasury)
                + market.pendingBalance(address(0), royalty),
            10e15
        );
    }

    function testUSDCSettlementAndReplayProtection() external {
        CreatorERC721 token = _deploy721();
        vm.prank(seller);
        token.setApprovalForAll(address(market), true);
        vm.prank(seller);
        uint256 listingId = market.createListing(
            address(token), 1, CollectionStandard.ERC721, 1, 100_000, address(usdc), 0
        );
        vm.startPrank(buyer);
        usdc.approve(address(market), type(uint256).max);
        market.purchase(listingId, bytes32(uint256(4)), 1);
        vm.expectRevert();
        market.purchase(listingId, bytes32(uint256(4)), 1);
        vm.stopPrank();
        assertEq(market.pendingBalance(address(usdc), seller), 92_500);
        assertEq(market.pendingBalance(address(usdc), treasury), 2_500);
        assertEq(market.pendingBalance(address(usdc), royalty), 5_000);
    }

    function testStaleUnsupportedAndPauseRejected() external {
        CreatorERC721 token = _deploy721();
        vm.prank(seller);
        token.setApprovalForAll(address(market), true);
        vm.prank(seller);
        vm.expectRevert();
        market.createListing(address(token), 1, CollectionStandard.ERC721, 1, 1, address(0x1234), 0);
        market.pause();
        vm.prank(seller);
        vm.expectRevert();
        market.createListing(address(token), 1, CollectionStandard.ERC721, 1, 1, address(0), 0);
    }

    function testExpiredAndStalePurchasesPreserveState() external {
        CreatorERC721 token = _deploy721();
        vm.startPrank(seller);
        token.setApprovalForAll(address(market), true);
        uint256 listingId = market.createListing(
            address(token),
            1,
            CollectionStandard.ERC721,
            1,
            1 ether,
            address(0),
            uint64(block.timestamp + 1)
        );
        vm.stopPrank();
        bytes32 purchaseId = bytes32(uint256(20));
        vm.warp(block.timestamp + 1);
        vm.prank(buyer);
        vm.expectRevert();
        market.purchase{ value: 1 ether }(listingId, purchaseId, 1);
        assertFalse(market.usedPurchaseIds(purchaseId));
        assertEq(market.getListing(listingId).quantity, 1);

        CreatorERC721 secondToken = _deploy721WithSalt(21);
        vm.startPrank(seller);
        secondToken.setApprovalForAll(address(market), true);
        uint256 staleListingId = market.createListing(
            address(secondToken), 1, CollectionStandard.ERC721, 1, 1 ether, address(0), 0
        );
        secondToken.transferFrom(seller, royalty, 1);
        vm.stopPrank();
        bytes32 stalePurchaseId = bytes32(uint256(21));
        vm.prank(buyer);
        vm.expectRevert();
        market.purchase{ value: 1 ether }(staleListingId, stalePurchaseId, 1);
        assertFalse(market.usedPurchaseIds(stalePurchaseId));
        assertEq(market.getListing(staleListingId).quantity, 1);
    }

    function testDelistedCurrencyCancellationAndETHWithdrawal() external {
        CreatorERC721 token = _deploy721();
        vm.startPrank(seller);
        token.setApprovalForAll(address(market), true);
        uint256 listingId = market.createListing(
            address(token), 1, CollectionStandard.ERC721, 1, 100_000, address(usdc), 0
        );
        vm.stopPrank();
        market.setCurrency(address(usdc), false);
        vm.startPrank(buyer);
        usdc.approve(address(market), type(uint256).max);
        vm.expectRevert();
        market.purchase(listingId, bytes32(uint256(30)), 1);
        vm.stopPrank();
        assertFalse(market.usedPurchaseIds(bytes32(uint256(30))));
        vm.prank(seller);
        market.cancelListing(listingId);

        CreatorERC721 ethToken = _deploy721WithSalt(31);
        vm.startPrank(seller);
        ethToken.setApprovalForAll(address(market), true);
        uint256 ethListing = market.createListing(
            address(ethToken), 1, CollectionStandard.ERC721, 1, 1 ether, address(0), 0
        );
        vm.stopPrank();
        vm.prank(buyer);
        market.purchase{ value: 1 ether }(ethListing, bytes32(uint256(31)), 1);
        uint256 sellerBefore = seller.balance;
        vm.prank(seller);
        market.withdraw(address(0));
        assertEq(seller.balance - sellerBefore, 0.925 ether);
        assertEq(market.pendingBalance(address(0), seller), 0);
    }

    function _deploy721() private returns (CreatorERC721 token) {
        return _deploy721WithSalt(11);
    }

    function _deploy721WithSalt(uint256 salt) private returns (CreatorERC721 token) {
        vm.prank(seller);
        address collection = factory.deployCollection(
            CollectionStandard.ERC721,
            address(implementation721),
            metadata,
            royalty,
            500,
            bytes32(salt)
        );
        token = CreatorERC721(collection);
        vm.prank(seller);
        token.mint(seller, 1, "ipfs://1");
    }

    function _deploy1155() private returns (CreatorERC1155 token) {
        vm.prank(seller);
        address collection = factory.deployCollection(
            CollectionStandard.ERC1155,
            address(implementation1155),
            metadata,
            royalty,
            500,
            bytes32(uint256(12))
        );
        token = CreatorERC1155(collection);
        vm.prank(seller);
        token.mint(seller, 7, 10, "ipfs://7");
    }
}
