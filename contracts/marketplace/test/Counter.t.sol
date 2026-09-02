// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest is Test {
    Counter private counter;
    address private owner = address(0xA11CE);
    address private stranger = address(0xB0B);

    function setUp() external {
        counter = new Counter(owner);
    }

    function testInitialState() external view {
        assertEq(counter.owner(), owner);
        assertEq(counter.number(), 0);
    }

    function testOwnerCanIncrement() external {
        vm.prank(owner);
        counter.increment();
        assertEq(counter.number(), 1);
    }

    function testStrangerCannotIncrement() external {
        vm.prank(stranger);
        vm.expectRevert();
        counter.increment();
    }
}
