// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {CreatorCollectionFactory} from "../src/CreatorCollectionFactory.sol";
import {CreatorERC721, CreatorERC1155} from "../src/CreatorCollection.sol";
import {MarketplaceSettlement} from "../src/MarketplaceSettlement.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract Deploy is Script {
    struct Deployment {
        address factoryImplementation;
        address settlementImplementation;
        address erc721Implementation;
        address erc1155Implementation;
        address factoryProxy;
        address settlementProxy;
    }

    function run() external returns (Deployment memory deployment) {
        address multisig = vm.envAddress("PLATFORM_MULTISIG");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 feeBps = vm.envUint("PLATFORM_FEE_BPS");
        bool broadcast = vm.envOr("BROADCAST", false);
        if (broadcast) vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        deployment.factoryImplementation = address(new CreatorCollectionFactory(address(this)));
        deployment.settlementImplementation = address(new MarketplaceSettlement(address(this), treasury, feeBps));
        deployment.erc721Implementation = address(new CreatorERC721());
        deployment.erc1155Implementation = address(new CreatorERC1155());

        bytes memory factoryInit = abi.encodeCall(CreatorCollectionFactory.initialize, (multisig));
        TransparentUpgradeableProxy factory = new TransparentUpgradeableProxy(
            deployment.factoryImplementation, multisig, factoryInit
        );
        bytes memory settlementInit = abi.encodeCall(MarketplaceSettlement.initialize, (multisig, treasury, feeBps));
        TransparentUpgradeableProxy settlement = new TransparentUpgradeableProxy(
            deployment.settlementImplementation, multisig, settlementInit
        );
        deployment.factoryProxy = address(factory);
        deployment.settlementProxy = address(settlement);
        if (broadcast) vm.stopBroadcast();
    }
}
