// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";

contract Verify is Script {
    function run() external view {
        string memory network = vm.envOr("VERIFY_NETWORK", string("base_sepolia"));
        require(bytes(network).length != 0, "VERIFY_NETWORK required");
    }
}
