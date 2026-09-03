// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {CollectionMetadata, CollectionStandard, ICollectionInitializable} from "./CollectionTypes.sol";

contract CreatorCollectionFactory is Ownable {
    using Clones for address;

    error InvalidAddress();
    error InvalidMetadata();
    error InvalidRoyalty(uint256 royaltyBps);
    error UnsupportedStandard();
    error ImplementationNotApproved(address implementation);
    error ImplementationStandardMismatch();
    error SaltAlreadyUsed();

    struct CollectionRecord {
        address creator;
        address implementation;
        CollectionStandard standard;
        CollectionMetadata metadata;
        address royaltyRecipient;
        uint96 royaltyBps;
        bytes32 salt;
    }

    mapping(CollectionStandard => mapping(address => bool)) public approvedImplementations;
    mapping(address => mapping(bytes32 => mapping(CollectionStandard => bool))) public usedSalts;
    mapping(address => CollectionRecord) private _collections;
    uint256 private _nonce;

    event ImplementationApprovalUpdated(address indexed implementation, CollectionStandard indexed standard, bool approved);
    event CollectionDeployed(
        address indexed collection,
        address indexed creator,
        address indexed implementation,
        CollectionStandard standard,
        string name,
        string symbol,
        string metadataURI,
        string description,
        string image,
        string externalURL,
        address royaltyRecipient,
        uint96 royaltyBps,
        bytes32 salt
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setImplementation(address implementation, CollectionStandard standard, bool approved) external onlyOwner {
        if (implementation == address(0)) revert InvalidAddress();
        approvedImplementations[standard][implementation] = approved;
        emit ImplementationApprovalUpdated(implementation, standard, approved);
    }

    function deployCollection(
        CollectionStandard standard,
        address implementation,
        CollectionMetadata calldata metadata,
        address royaltyRecipient,
        uint96 royaltyBps,
        bytes32 salt
    ) external returns (address collection) {
        if (implementation == address(0) || royaltyRecipient == address(0)) revert InvalidAddress();
        if (bytes(metadata.name).length == 0 || bytes(metadata.metadataURI).length == 0) revert InvalidMetadata();
        if (standard == CollectionStandard.ERC721 && bytes(metadata.symbol).length == 0) revert InvalidMetadata();
        if (royaltyBps > 1000) revert InvalidRoyalty(royaltyBps);
        if (!approvedImplementations[standard][implementation]) revert ImplementationNotApproved(implementation);
        if (standard != CollectionStandard.ERC721 && standard != CollectionStandard.ERC1155) revert UnsupportedStandard();

        bytes32 deploymentSalt = salt;
        if (salt == bytes32(0)) {
            deploymentSalt = keccak256(abi.encode(msg.sender, _nonce++));
        } else {
            if (usedSalts[msg.sender][salt][standard]) revert SaltAlreadyUsed();
            usedSalts[msg.sender][salt][standard] = true;
        }

        collection = implementation.cloneDeterministic(deploymentSalt);
        ICollectionInitializable(collection).initialize(msg.sender, metadata, royaltyRecipient, royaltyBps);
        _storeCollection(collection, msg.sender, implementation, standard, metadata, royaltyRecipient, royaltyBps, deploymentSalt);
        _emitCollectionDeployed(collection);
    }

    function _storeCollection(
        address collection,
        address creator,
        address implementation,
        CollectionStandard standard,
        CollectionMetadata calldata metadata,
        address royaltyRecipient,
        uint96 royaltyBps,
        bytes32 salt
    ) private {
        _collections[collection] = CollectionRecord(
            creator, implementation, standard, metadata, royaltyRecipient, royaltyBps, salt
        );
    }

    function _emitCollectionDeployed(address collection) private {
        CollectionRecord storage record = _collections[collection];
        CollectionMetadata storage metadata = record.metadata;
        emit CollectionDeployed(
            collection,
            record.creator,
            record.implementation,
            record.standard,
            metadata.name,
            metadata.symbol,
            metadata.metadataURI,
            metadata.description,
            metadata.image,
            metadata.externalURL,
            record.royaltyRecipient,
            record.royaltyBps,
            record.salt
        );
    }

    function getCollection(address collection) external view returns (CollectionRecord memory) {
        return _collections[collection];
    }

    function predictCollectionAddress(CollectionStandard standard, address implementation, address creator, bytes32 salt) external view returns (address) {
        bytes32 deploymentSalt = salt == bytes32(0) ? keccak256(abi.encode(creator, _nonce)) : salt;
        return implementation.predictDeterministicAddress(deploymentSalt, address(this));
    }
}
