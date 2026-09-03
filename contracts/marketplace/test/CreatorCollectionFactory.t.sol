// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {CreatorCollectionFactory} from "../src/CreatorCollectionFactory.sol";
import {CreatorERC721, CreatorERC1155} from "../src/CreatorCollection.sol";
import {CollectionMetadata, CollectionStandard} from "../src/CollectionTypes.sol";

contract CreatorCollectionFactoryTest is Test {
    CreatorCollectionFactory factory;
    CreatorERC721 implementation721;
    CreatorERC1155 implementation1155;
    address creator = address(0xCAFE);
    address royalty = address(0xBEEF);
    CollectionMetadata metadata = CollectionMetadata("Art", "ART", "ipfs://collection", "desc", "ipfs://image", "https://example.com");

    function setUp() external {
        factory = new CreatorCollectionFactory(address(this));
        implementation721 = new CreatorERC721();
        implementation1155 = new CreatorERC1155();
        factory.setImplementation(address(implementation721), CollectionStandard.ERC721, true);
        factory.setImplementation(address(implementation1155), CollectionStandard.ERC1155, true);
    }

    function testDeploys721AndEmitsData() external {
        bytes32 salt = bytes32(uint256(1));
        bytes32 deploymentSalt = salt;
        address predicted = factory.predictCollectionAddress(
            CollectionStandard.ERC721, address(implementation721), creator, salt
        );
        vm.expectEmit(true, true, true, true);
        emit CreatorCollectionFactory.CollectionDeployed(
            predicted, creator, address(implementation721), CollectionStandard.ERC721,
            metadata.name, metadata.symbol, metadata.metadataURI, metadata.description,
            metadata.image, metadata.externalURL, royalty, 500, deploymentSalt
        );
        vm.prank(creator);
        address collection = factory.deployCollection(CollectionStandard.ERC721, address(implementation721), metadata, royalty, 500, salt);
        CreatorERC721 token = CreatorERC721(collection);
        assertEq(token.owner(), creator);
        assertEq(token.name(), "Art");
        (address receiver, uint256 amount) = token.royaltyInfo(1, 10_000);
        assertEq(receiver, royalty);
        assertEq(amount, 500);
        assertEq(factory.getCollection(collection).creator, creator);
    }

    function testDeploys1155() external {
        vm.prank(creator);
        address collection = factory.deployCollection(CollectionStandard.ERC1155, address(implementation1155), metadata, royalty, 0, bytes32(0));
        assertEq(CreatorERC1155(collection).owner(), creator);
        assertEq(CreatorERC1155(collection).uri(1), metadata.metadataURI);
    }

    function testRejectsUnapprovedAndHighRoyalty() external {
        vm.prank(creator);
        vm.expectRevert(CreatorCollectionFactory.ImplementationNotApproved.selector);
        factory.deployCollection(CollectionStandard.ERC721, address(0x1234), metadata, royalty, 0, bytes32(0));
        vm.expectRevert(CreatorCollectionFactory.InvalidRoyalty.selector);
        factory.deployCollection(CollectionStandard.ERC721, address(implementation721), metadata, royalty, 1001, bytes32(0));
    }

    function testSaltCannotBeReusedByCreatorAndStandard() external {
        vm.startPrank(creator);
        factory.deployCollection(CollectionStandard.ERC721, address(implementation721), metadata, royalty, 0, bytes32(uint256(7)));
        vm.expectRevert(CreatorCollectionFactory.SaltAlreadyUsed.selector);
        factory.deployCollection(CollectionStandard.ERC721, address(implementation721), metadata, royalty, 0, bytes32(uint256(7)));
        vm.stopPrank();
    }

    function testOnlyOwnerCanApprove() external {
        vm.prank(creator);
        vm.expectRevert();
        factory.setImplementation(address(0x1234), CollectionStandard.ERC721, true);
    }
}
