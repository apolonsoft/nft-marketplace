// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { ERC1155Supply } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import { ERC2981 } from "@openzeppelin/contracts/token/common/ERC2981.sol";
import { CollectionMetadata, ICollectionInitializable } from "./CollectionTypes.sol";

abstract contract CollectionBase is ERC2981, ICollectionInitializable {
    error AlreadyInitialized();
    error Unauthorized();
    error InvalidCreator();

    address public owner;
    bool public initialized;
    string public collectionName;
    string public collectionSymbol;
    string public metadataURI;
    string public description;
    string public image;
    string public externalURL;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function _initializeBase(
        address creator,
        CollectionMetadata calldata metadata,
        address royaltyRecipient,
        uint96 royaltyBps
    ) internal {
        if (initialized) revert AlreadyInitialized();
        if (creator == address(0)) revert InvalidCreator();
        initialized = true;
        owner = creator;
        collectionName = metadata.name;
        collectionSymbol = metadata.symbol;
        metadataURI = metadata.metadataURI;
        description = metadata.description;
        image = metadata.image;
        externalURL = metadata.externalURL;
        _setDefaultRoyalty(royaltyRecipient, royaltyBps);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

contract CreatorERC721 is ERC721, CollectionBase {
    error InvalidRecipient();
    error InvalidTokenURI();
    error TokenAlreadyMinted(uint256 tokenId);
    error TokenDoesNotExist(uint256 tokenId);
    error TokenIsFrozen(uint256 tokenId);
    error CollectionIsFrozen();
    error TokenAlreadyFrozen(uint256 tokenId);
    error CollectionAlreadyFrozen();
    error ArrayLengthMismatch();

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bool) public tokenFrozen;
    bool public collectionFrozen;

    event TokenMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event TokenURIUpdated(uint256 indexed tokenId, string tokenURI);
    event TokenFrozen(uint256 indexed tokenId);
    event CollectionFrozen();

    constructor() ERC721("", "") {
        initialized = true;
    }

    function initialize(
        address creator,
        CollectionMetadata calldata metadata,
        address royaltyRecipient,
        uint96 royaltyBps
    ) external override {
        _initializeBase(creator, metadata, royaltyRecipient, royaltyBps);
    }

    function name() public view override returns (string memory) {
        return collectionName;
    }

    function symbol() public view override returns (string memory) {
        return collectionSymbol;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, CollectionBase)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function mint(address to, uint256 tokenId, string calldata tokenURI_) external onlyOwner {
        if (collectionFrozen) revert CollectionIsFrozen();
        if (to == address(0)) revert InvalidRecipient();
        if (bytes(tokenURI_).length == 0) revert InvalidTokenURI();
        if (_ownerOf(tokenId) != address(0)) revert TokenAlreadyMinted(tokenId);
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = tokenURI_;
        emit TokenMinted(to, tokenId, tokenURI_);
    }

    function mintBatch(address to, uint256[] calldata tokenIds, string[] calldata tokenURIs)
        external
        onlyOwner
    {
        if (collectionFrozen) revert CollectionIsFrozen();
        if (to == address(0)) revert InvalidRecipient();
        if (tokenIds.length != tokenURIs.length) revert ArrayLengthMismatch();
        for (uint256 i; i < tokenIds.length; ++i) {
            if (bytes(tokenURIs[i]).length == 0) revert InvalidTokenURI();
            if (_ownerOf(tokenIds[i]) != address(0)) revert TokenAlreadyMinted(tokenIds[i]);
            for (uint256 j; j < i; ++j) {
                if (tokenIds[i] == tokenIds[j]) revert TokenAlreadyMinted(tokenIds[i]);
            }
        }
        for (uint256 i; i < tokenIds.length; ++i) {
            _safeMint(to, tokenIds[i]);
            _tokenURIs[tokenIds[i]] = tokenURIs[i];
            emit TokenMinted(to, tokenIds[i], tokenURIs[i]);
        }
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function setTokenURI(uint256 tokenId, string calldata tokenURI_) external onlyOwner {
        _requireMutableToken(tokenId);
        if (bytes(tokenURI_).length == 0) revert InvalidTokenURI();
        _tokenURIs[tokenId] = tokenURI_;
        emit TokenURIUpdated(tokenId, tokenURI_);
    }

    function freezeToken(uint256 tokenId) external onlyOwner {
        _requireOwned(tokenId);
        if (tokenFrozen[tokenId]) revert TokenAlreadyFrozen(tokenId);
        tokenFrozen[tokenId] = true;
        emit TokenFrozen(tokenId);
    }

    function freezeCollection() external onlyOwner {
        if (collectionFrozen) revert CollectionAlreadyFrozen();
        collectionFrozen = true;
        emit CollectionFrozen();
    }

    function _requireMutableToken(uint256 tokenId) private view {
        _requireOwned(tokenId);
        if (collectionFrozen) revert CollectionIsFrozen();
        if (tokenFrozen[tokenId]) revert TokenIsFrozen(tokenId);
    }
}

contract CreatorERC1155 is ERC1155Supply, CollectionBase {
    error InvalidRecipient();
    error InvalidQuantity();
    error InvalidTokenURI();
    error TokenAlreadyMinted(uint256 tokenId);
    error TokenDoesNotExist(uint256 tokenId);
    error TokenIsFrozen(uint256 tokenId);
    error CollectionIsFrozen();
    error TokenAlreadyFrozen(uint256 tokenId);
    error CollectionAlreadyFrozen();
    error ArrayLengthMismatch();

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bool) public tokenFrozen;
    bool public collectionFrozen;

    event TokenMinted(
        address indexed to, uint256 indexed tokenId, uint256 quantity, string tokenURI
    );
    event TokenURIUpdated(uint256 indexed tokenId, string tokenURI);
    event TokenFrozen(uint256 indexed tokenId);
    event CollectionURIUpdated(string collectionURI);
    event CollectionFrozen();

    constructor() ERC1155("") {
        initialized = true;
    }

    function initialize(
        address creator,
        CollectionMetadata calldata metadata,
        address royaltyRecipient,
        uint96 royaltyBps
    ) external override {
        _initializeBase(creator, metadata, royaltyRecipient, royaltyBps);
        _setURI(metadata.metadataURI);
    }

    function mint(address to, uint256 tokenId, uint256 quantity, string calldata tokenURI_)
        external
        onlyOwner
    {
        _validateMint(to, tokenId, quantity, tokenURI_);
        _mint(to, tokenId, quantity, "");
        _tokenURIs[tokenId] = tokenURI_;
        emit TokenMinted(to, tokenId, quantity, tokenURI_);
    }

    function mintBatch(
        address to,
        uint256[] calldata tokenIds,
        uint256[] calldata quantities,
        string[] calldata tokenURIs
    ) external onlyOwner {
        if (collectionFrozen) revert CollectionIsFrozen();
        if (to == address(0)) revert InvalidRecipient();
        if (
            tokenIds.length == 0 || tokenIds.length != quantities.length
                || tokenIds.length != tokenURIs.length
        ) {
            revert ArrayLengthMismatch();
        }
        for (uint256 i; i < tokenIds.length; ++i) {
            _validateMint(to, tokenIds[i], quantities[i], tokenURIs[i]);
            for (uint256 j; j < i; ++j) {
                if (tokenIds[i] == tokenIds[j]) revert TokenAlreadyMinted(tokenIds[i]);
            }
        }
        uint256[] memory ids = tokenIds;
        uint256[] memory amounts = quantities;
        _mintBatch(to, ids, amounts, "");
        for (uint256 i; i < tokenIds.length; ++i) {
            _tokenURIs[tokenIds[i]] = tokenURIs[i];
            emit TokenMinted(to, tokenIds[i], quantities[i], tokenURIs[i]);
        }
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        if (totalSupply(tokenId) == 0) revert TokenDoesNotExist(tokenId);
        return _tokenURIs[tokenId];
    }

    function setTokenURI(uint256 tokenId, string calldata tokenURI_) external onlyOwner {
        _requireMutableToken(tokenId);
        if (bytes(tokenURI_).length == 0) revert InvalidTokenURI();
        _tokenURIs[tokenId] = tokenURI_;
        emit TokenURIUpdated(tokenId, tokenURI_);
    }

    function setTokenURIBatch(uint256[] calldata tokenIds, string[] calldata tokenURIs)
        external
        onlyOwner
    {
        if (tokenIds.length == 0 || tokenIds.length != tokenURIs.length) {
            revert ArrayLengthMismatch();
        }
        for (uint256 i; i < tokenIds.length; ++i) {
            _requireMutableToken(tokenIds[i]);
            if (bytes(tokenURIs[i]).length == 0) revert InvalidTokenURI();
            for (uint256 j; j < i; ++j) {
                if (tokenIds[i] == tokenIds[j]) revert TokenAlreadyMinted(tokenIds[i]);
            }
        }
        for (uint256 i; i < tokenIds.length; ++i) {
            _tokenURIs[tokenIds[i]] = tokenURIs[i];
            emit TokenURIUpdated(tokenIds[i], tokenURIs[i]);
        }
    }

    function setCollectionURI(string calldata collectionURI_) external onlyOwner {
        if (collectionFrozen) revert CollectionIsFrozen();
        if (bytes(collectionURI_).length == 0) revert InvalidTokenURI();
        metadataURI = collectionURI_;
        _setURI(collectionURI_);
        emit CollectionURIUpdated(collectionURI_);
    }

    function freezeToken(uint256 tokenId) external onlyOwner {
        if (totalSupply(tokenId) == 0) revert TokenDoesNotExist(tokenId);
        if (tokenFrozen[tokenId]) revert TokenAlreadyFrozen(tokenId);
        tokenFrozen[tokenId] = true;
        emit TokenFrozen(tokenId);
    }

    function freezeCollection() external onlyOwner {
        if (collectionFrozen) revert CollectionAlreadyFrozen();
        collectionFrozen = true;
        emit CollectionFrozen();
    }

    function _validateMint(address to, uint256 tokenId, uint256 quantity, string calldata tokenURI_)
        private
        view
    {
        if (collectionFrozen) revert CollectionIsFrozen();
        if (to == address(0)) revert InvalidRecipient();
        if (quantity == 0) revert InvalidQuantity();
        if (bytes(tokenURI_).length == 0) revert InvalidTokenURI();
        if (totalSupply(tokenId) != 0) revert TokenAlreadyMinted(tokenId);
    }

    function _requireMutableToken(uint256 tokenId) private view {
        if (totalSupply(tokenId) == 0) revert TokenDoesNotExist(tokenId);
        if (collectionFrozen) revert CollectionIsFrozen();
        if (tokenFrozen[tokenId]) revert TokenIsFrozen(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, CollectionBase)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
