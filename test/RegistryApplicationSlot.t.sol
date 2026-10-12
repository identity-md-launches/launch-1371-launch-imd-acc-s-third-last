// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {RegistryBase} from "./ProjectRegistry.t.sol";

/// @dev Audit finding 4bc1aedb (low), reproduced and kept as a documented design limit: an
/// application posts no bond, so anyone can hold a project's single ask slot for the oracle fee
/// alone by filing an application the panel will refuse. These tests pin what that costs and how
/// long it lasts, so a later change to the fee, the slot rule or `PENDING_EXPIRY` shows up here:
/// every round costs the full fee, a refused round frees the slot at once, a round the writer never
/// answers is cleared by anyone after a day, and the project's own application wins the moment the
/// slot is free. Nothing is lost by the project and nothing is mis-listed.
contract RegistryApplicationSlotTest is RegistryBase {
    address internal griefer = makeAddr("griefer");

    function setUp() public override {
        super.setUp();
        _fund(griefer);
    }

    function _grief() internal returns (bytes32 id) {
        vm.prank(griefer);
        id = reg.applyListing(project, "P", "https://p.example", 25, griefer);
    }

    /// @dev The audit's reproduction: three refused rounds cost exactly three fees and hold the
    /// slot against the project's own application each time; the fourth round is the project's.
    function test_applicationSlotCostsTheFullFeePerPanelRound() public {
        uint256 fee = reg.ORACLE_FEE();
        uint256 before = imd.balanceOf(griefer);
        for (uint256 i; i < 3; ++i) {
            bytes32 id = _grief();
            vm.expectRevert(ProjectRegistry.AskOpen.selector);
            _apply();
            assertTrue(_answer(id, false), "refusal delivered");
            assertFalse(reg.isListed(project));
            assertEq(uint8(reg.projectOf(project).ask), uint8(ProjectRegistry.Ask.None));
        }
        assertEq(before - imd.balanceOf(griefer), 3 * fee, "the griefer pays the fee every round");
        assertEq(imd.balanceOf(address(reg)), 0, "the registry holds nothing from applications");

        // The slot is free the moment the refusal lands; the project's own terms win from here.
        uint256 ownerBefore = imd.balanceOf(applicant);
        assertTrue(_answer(_apply(), true));
        assertTrue(reg.isListed(project));
        assertEq(reg.projectOf(project).beneficiary, beneficiary);
        assertEq(reg.projectOf(project).rateBps, 50);
        assertEq(ownerBefore - imd.balanceOf(applicant), fee, "the project paid one fee");
    }

    /// @dev A refused body or a split panel frees the slot in the same block as the failure call.
    function test_failedGriefingRoundFreesTheSlotAtOnce() public {
        bytes32 id = _grief();
        vm.expectRevert(ProjectRegistry.AskOpen.selector);
        _apply();
        assertTrue(intake.fail(id, 2, "disagreed", MAINNET_CALLBACK_GAS));
        assertTrue(_answer(_apply(), true));
        assertTrue(reg.isListed(project));
    }

    /// @dev The worst case the audit names: the writer never answers. The hold is bounded by
    /// `PENDING_EXPIRY`: anyone clears it a day after the ask, and the project applies at once.
    function test_unansweredGriefingRoundIsClearedByAnyoneAfterADay() public {
        bytes32 id = _grief();
        uint64 askedAt = reg.projectOf(project).askedAt;
        uint256 expiry = uint256(askedAt) + reg.PENDING_EXPIRY();

        vm.warp(expiry);
        vm.expectRevert(ProjectRegistry.NotStale.selector);
        reg.expire(project);
        vm.expectRevert(ProjectRegistry.AskOpen.selector);
        _apply();

        vm.warp(expiry + 1);
        vm.prank(makeAddr("anyone"));
        vm.expectEmit(true, true, false, true, address(reg));
        emit ProjectRegistry.AskCleared(project, id, ProjectRegistry.Ask.Apply, 0, "expired");
        reg.expire(project);
        assertEq(reg.projectOfIntake(id), address(0));

        assertTrue(_answer(_apply(), true));
        assertTrue(reg.isListed(project));
    }

    /// @dev Once the Intake has completed the request without reaching the callback (a lost
    /// delivery), the hold ends as soon as anyone calls `expire`, without waiting a day.
    function test_completedButUndeliveredGriefingRoundIsClearedWithinTheDay() public {
        bytes32 id = _grief();
        intake.completeSilently(id);
        vm.prank(makeAddr("anyone"));
        reg.expire(project);
        assertEq(uint8(reg.projectOf(project).ask), uint8(ProjectRegistry.Ask.None));
        assertTrue(_answer(_apply(), true));
    }

    /// @dev A refused griefing round never leaks its terms into the listing that follows: the
    /// project is listed with the terms of the application the panel accepted.
    function testFuzz_refusedTermsNeverReachTheListing(uint16 rawRate, address who) public {
        uint16 rate = uint16(bound(rawRate, reg.MIN_RATE_BPS(), reg.MAX_RATE_BPS()));
        vm.assume(who != address(0) && who != beneficiary);
        vm.prank(griefer);
        bytes32 id = reg.applyListing(project, "P", "https://p.example", rate, who);
        assertTrue(_answer(id, false));
        assertTrue(_answer(_apply(), true));
        ProjectRegistry.Project memory p = reg.projectOf(project);
        assertEq(p.beneficiary, beneficiary);
        assertEq(p.rateBps, 50);
        assertTrue(p.listed);
    }
}
