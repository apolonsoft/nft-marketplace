// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {
    ITransparentUpgradeableProxy,
    TransparentUpgradeableProxy
} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { CreatorCollectionFactory } from "../src/CreatorCollectionFactory.sol";
import { MarketplaceSettlement } from "../src/MarketplaceSettlement.sol";
import { CollectionStandard } from "../src/CollectionTypes.sol";

contract ThresholdMultisig {
    address public immutable signerA;
    address public immutable signerB;
    mapping(bytes32 => mapping(address => bool)) public approved;

    constructor(address signerA_, address signerB_) {
        signerA = signerA_;
        signerB = signerB_;
    }

    function approve(bytes32 operation) external {
        require(msg.sender == signerA || msg.sender == signerB, "not signer");
        approved[operation][msg.sender] = true;
    }

    function execute(address target, bytes calldata data) external returns (bytes memory) {
        require(msg.sender == signerA || msg.sender == signerB, "not signer");
        bytes32 operation = keccak256(abi.encode(target, data));
        require(approved[operation][signerA] && approved[operation][signerB], "threshold");
        (bool success, bytes memory result) = target.call(data);
        require(success, "execution failed");
        return result;
    }
}

contract MarketplaceSettlementV2 is MarketplaceSettlement {
    uint256 public versionValue;

    constructor() MarketplaceSettlement(address(1), address(1), 0) { }

    function initializeV2(uint256 value) external {
        require(versionValue == 0, "initialized");
        versionValue = value;
    }
}

contract UpgradeGovernanceTest is Test {
    bytes32 private constant ADMIN_SLOT =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
    address private signerA = address(0xA11CE);
    address private signerB = address(0xB0B);
    address private outsider = address(0xBAD);
    address private treasury = address(0xFEE);
    ThresholdMultisig private multisig;

    function setUp() external {
        multisig = new ThresholdMultisig(signerA, signerB);
    }

    function testFactoryProxyUsesMultisigForRuntimeAdministration() external {
        CreatorCollectionFactory implementation = new CreatorCollectionFactory(address(this));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            address(multisig),
            abi.encodeCall(CreatorCollectionFactory.initialize, (address(multisig)))
        );
        CreatorCollectionFactory factory = CreatorCollectionFactory(address(proxy));
        assertEq(factory.owner(), address(multisig));
        vm.prank(outsider);
        vm.expectRevert();
        factory.setImplementation(address(1), CollectionStandard.ERC721, true);
        bytes memory callData = abi.encodeCall(
            CreatorCollectionFactory.setImplementation,
            (address(1), CollectionStandard.ERC721, true)
        );
        _approveAndExecute(address(factory), callData);
        assertTrue(factory.approvedImplementations(CollectionStandard.ERC721, address(1)));
    }

    function testSingleSignerCannotUpgradeAndThresholdCanUpgradeAndCall() external {
        MarketplaceSettlement implementation =
            new MarketplaceSettlement(address(this), treasury, 250);
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            address(multisig),
            abi.encodeCall(MarketplaceSettlement.initialize, (address(multisig), treasury, 250))
        );
        MarketplaceSettlement market = MarketplaceSettlement(payable(address(proxy)));
        address proxyAdminAddress = address(uint160(uint256(vm.load(address(proxy), ADMIN_SLOT))));
        ProxyAdmin proxyAdmin = ProxyAdmin(proxyAdminAddress);
        assertEq(proxyAdmin.owner(), address(multisig));
        assertEq(market.owner(), address(multisig));
        assertEq(market.nextListingId(), 1);

        MarketplaceSettlementV2 implementationV2 = new MarketplaceSettlementV2();
        bytes memory upgradeData = abi.encodeCall(
            ProxyAdmin.upgradeAndCall,
            (
                ITransparentUpgradeableProxy(address(proxy)),
                address(implementationV2),
                abi.encodeCall(MarketplaceSettlementV2.initializeV2, (2))
            )
        );
        bytes32 operation = keccak256(abi.encode(address(proxyAdmin), upgradeData));
        vm.prank(signerA);
        multisig.approve(operation);
        vm.prank(signerA);
        vm.expectRevert("threshold");
        multisig.execute(address(proxyAdmin), upgradeData);

        vm.prank(signerB);
        multisig.approve(operation);
        vm.prank(signerA);
        multisig.execute(address(proxyAdmin), upgradeData);
        assertEq(MarketplaceSettlementV2(payable(address(proxy))).versionValue(), 2);
        assertEq(market.treasury(), treasury);
        assertEq(market.platformFeeBps(), 250);
    }

    function testImplementationsCannotBeReinitialized() external {
        CreatorCollectionFactory factory = new CreatorCollectionFactory(address(this));
        vm.expectRevert(CreatorCollectionFactory.AlreadyInitialized.selector);
        factory.initialize(address(multisig));
        MarketplaceSettlement market = new MarketplaceSettlement(address(this), treasury, 250);
        vm.expectRevert(MarketplaceSettlement.AlreadyInitialized.selector);
        market.initialize(address(multisig), treasury, 250);
    }

    function _approveAndExecute(address target, bytes memory data) private {
        bytes32 operation = keccak256(abi.encode(target, data));
        vm.prank(signerA);
        multisig.approve(operation);
        vm.prank(signerB);
        multisig.approve(operation);
        vm.prank(signerA);
        multisig.execute(target, data);
    }
}
