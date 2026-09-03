// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {CollectionMetadata, ICollectionInitializable} from "./CollectionTypes.sol";

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

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

contract CreatorERC721 is ERC721, CollectionBase {
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

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, CollectionBase) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

contract CreatorERC1155 is ERC1155, CollectionBase {
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

    function uri(uint256) public view override returns (string memory) {
        return metadataURI;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, CollectionBase) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
