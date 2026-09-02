// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Counter is Ownable {
    uint256 public number;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function increment() external onlyOwner {
        number += 1;
    }
}
