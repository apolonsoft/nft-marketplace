// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

enum CollectionStandard {
    ERC721,
    ERC1155
}

struct CollectionMetadata {
    string name;
    string symbol;
    string metadataURI;
    string description;
    string image;
    string externalURL;
}

interface ICollectionInitializable {
    function initialize(
        address creator,
        CollectionMetadata calldata metadata,
        address royaltyRecipient,
        uint96 royaltyBps
    ) external;
}
