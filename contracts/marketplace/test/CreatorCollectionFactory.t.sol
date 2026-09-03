// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { CreatorCollectionFactory } from "../src/CreatorCollectionFactory.sol";
import { CreatorERC721, CreatorERC1155 } from "../src/CreatorCollection.sol";
import { CollectionMetadata, CollectionStandard } from "../src/CollectionTypes.sol";

contract CreatorCollectionFactoryTest is Test {
    CreatorCollectionFactory factory;
    CreatorERC721 implementation721;
    CreatorERC1155 implementation1155;
    address creator = address(0xCAFE);
    address royalty = address(0xBEEF);
    CollectionMetadata metadata = CollectionMetadata(
        "Art", "ART", "ipfs://collection", "desc", "ipfs://image", "https://example.com"
    );

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
            predicted,
            creator,
            address(implementation721),
            CollectionStandard.ERC721,
            metadata.name,
            metadata.symbol,
            metadata.metadataURI,
            metadata.description,
            metadata.image,
            metadata.externalURL,
            royalty,
            500,
            deploymentSalt
        );
        vm.prank(creator);
        address collection = factory.deployCollection(
            CollectionStandard.ERC721, address(implementation721), metadata, royalty, 500, salt
        );
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
        address collection = factory.deployCollection(
            CollectionStandard.ERC1155,
            address(implementation1155),
            metadata,
            royalty,
            0,
            bytes32(0)
        );
        CreatorERC1155 token = CreatorERC1155(collection);
        assertEq(token.owner(), creator);
        vm.prank(creator);
        token.mint(creator, 1, 1, "ipfs://token-1");
        assertEq(token.uri(1), "ipfs://token-1");
    }

    function _deploy1155() private returns (CreatorERC1155 token) {
        vm.prank(creator);
        address collection = factory.deployCollection(
            CollectionStandard.ERC1155,
            address(implementation1155),
            metadata,
            royalty,
            500,
            bytes32(uint256(200))
        );
        return CreatorERC1155(collection);
    }

    function testERC1155QuantitySupplyPartialTransferAndURIs() external {
        CreatorERC1155 token = _deploy1155();
        vm.startPrank(creator);
        token.mint(creator, 1, 10, "ipfs://token-1");
        uint256[] memory ids = new uint256[](2);
        ids[0] = 2;
        ids[1] = 3;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 4;
        amounts[1] = 7;
        string[] memory uris = new string[](2);
        uris[0] = "ipfs://token-2";
        uris[1] = "ipfs://token-3";
        token.mintBatch(creator, ids, amounts, uris);
        token.setTokenURI(1, "ipfs://token-1-updated");
        vm.stopPrank();
        assertEq(token.totalSupply(1), 10);
        assertEq(token.totalSupply(2), 4);
        assertEq(token.balanceOf(creator, 1), 10);
        vm.prank(creator);
        token.safeTransferFrom(creator, stranger(), 1, 3, "");
        assertEq(token.balanceOf(creator, 1), 7);
        assertEq(token.balanceOf(stranger(), 1), 3);
        assertEq(token.uri(1), "ipfs://token-1-updated");
    }

    function testERC1155ValidationFreezeAndUnauthorized() external {
        CreatorERC1155 token = _deploy1155();
        vm.prank(stranger());
        vm.expectRevert();
        token.mint(creator, 1, 1, "ipfs://1");
        vm.startPrank(creator);
        vm.expectRevert(CreatorERC1155.InvalidQuantity.selector);
        token.mint(creator, 1, 0, "ipfs://1");
        token.mint(creator, 1, 2, "ipfs://1");
        token.freezeToken(1);
        vm.expectRevert();
        token.setTokenURI(1, "ipfs://changed");
        token.freezeCollection();
        vm.expectRevert(CreatorERC1155.CollectionIsFrozen.selector);
        token.mint(creator, 2, 1, "ipfs://2");
        vm.stopPrank();
        vm.expectRevert();
        token.uri(99);
    }

    function testRejectsUnapprovedAndHighRoyalty() external {
        vm.prank(creator);
        vm.expectRevert();
        factory.deployCollection(
            CollectionStandard.ERC721, address(0x1234), metadata, royalty, 0, bytes32(0)
        );
        vm.expectRevert();
        factory.deployCollection(
            CollectionStandard.ERC721,
            address(implementation721),
            metadata,
            royalty,
            1001,
            bytes32(0)
        );
    }

    function testSaltCannotBeReusedByCreatorAndStandard() external {
        vm.startPrank(creator);
        factory.deployCollection(
            CollectionStandard.ERC721,
            address(implementation721),
            metadata,
            royalty,
            0,
            bytes32(uint256(7))
        );
        vm.expectRevert(CreatorCollectionFactory.SaltAlreadyUsed.selector);
        factory.deployCollection(
            CollectionStandard.ERC721,
            address(implementation721),
            metadata,
            royalty,
            0,
            bytes32(uint256(7))
        );
        vm.stopPrank();
    }

    function testOnlyOwnerCanApprove() external {
        vm.prank(creator);
        vm.expectRevert();
        factory.setImplementation(address(0x1234), CollectionStandard.ERC721, true);
    }

    function _deploy721() private returns (CreatorERC721 token) {
        vm.prank(creator);
        address collection = factory.deployCollection(
            CollectionStandard.ERC721,
            address(implementation721),
            metadata,
            royalty,
            500,
            bytes32(uint256(100))
        );
        return CreatorERC721(collection);
    }

    function testCreatorCanMintAndUpdateTokenURI() external {
        CreatorERC721 token = _deploy721();
        vm.startPrank(creator);
        token.mint(creator, 1, "ipfs://token-1");
        assertEq(token.ownerOf(1), creator);
        assertEq(token.tokenURI(1), "ipfs://token-1");
        token.setTokenURI(1, "ipfs://token-1-updated");
        assertEq(token.tokenURI(1), "ipfs://token-1-updated");
        vm.stopPrank();
    }

    function testUnauthorizedCannotMintOrUpdate() external {
        CreatorERC721 token = _deploy721();
        vm.prank(stranger());
        vm.expectRevert();
        token.mint(creator, 1, "ipfs://token-1");
        vm.prank(creator);
        token.mint(creator, 1, "ipfs://token-1");
        vm.prank(stranger());
        vm.expectRevert();
        token.setTokenURI(1, "ipfs://bad");
    }

    function testTokenAndCollectionFreezeBlockMutationButNotTransfers() external {
        CreatorERC721 token = _deploy721();
        vm.startPrank(creator);
        token.mint(creator, 1, "ipfs://token-1");
        token.freezeToken(1);
        vm.expectRevert();
        token.setTokenURI(1, "ipfs://changed");
        token.mint(creator, 2, "ipfs://token-2");
        token.freezeCollection();
        vm.expectRevert(CreatorERC721.CollectionIsFrozen.selector);
        token.mint(creator, 3, "ipfs://token-3");
        vm.expectRevert(CreatorERC721.CollectionIsFrozen.selector);
        token.setTokenURI(2, "ipfs://changed");
        vm.stopPrank();
        vm.prank(creator);
        token.transferFrom(creator, stranger(), 1);
        assertEq(token.ownerOf(1), stranger());
    }

    function testBatchMintAndValidation() external {
        CreatorERC721 token = _deploy721();
        vm.startPrank(creator);
        uint256[] memory ids = new uint256[](2);
        ids[0] = 10;
        ids[1] = 11;
        string[] memory uris = new string[](2);
        uris[0] = "ipfs://10";
        uris[1] = "ipfs://11";
        token.mintBatch(creator, ids, uris);
        assertEq(token.tokenURI(10), "ipfs://10");
        assertEq(token.tokenURI(11), "ipfs://11");
        vm.expectRevert(CreatorERC721.ArrayLengthMismatch.selector);
        string[] memory shortURIs = new string[](1);
        shortURIs[0] = "ipfs://bad";
        token.mintBatch(creator, ids, shortURIs);
        vm.stopPrank();
    }

    function stranger() private pure returns (address) {
        return address(0xD00D);
    }
}
