// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {RegistryBase} from "./ProjectRegistry.t.sol";
import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {OracleAttestation} from "../src/oracle/OracleAttestation.sol";

/// @dev An IMD whose issuer can block a wallet from receiving: not the Sepolia test IMD (a plain
/// mintable token), but the shape a compliance-gated token on another chain could have. Used to
/// see what a payout that reverts does to the question and to everybody else's funds.
contract BlocklistIMD is ERC20 {
    mapping(address => bool) public blocked;

    constructor() ERC20("Blocklist IMD", "bIMD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function block_(address who, bool on) external {
        blocked[who] = on;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!blocked[to], "blocked");
        super._update(from, to, value);
    }
}

/// @dev Edges of the settlement payouts and the panel checks: a payout that cannot be made, a
/// panel larger than asked, a bond of zero, and the same answer presented to two registries.
contract RegistryPayoutEdgesTest is RegistryBase {
    BlocklistIMD internal bimd;
    ProjectRegistry internal breg;

    function _blocklistFixture() internal {
        bimd = new BlocklistIMD();
        breg = new ProjectRegistry(
            address(intake),
            address(bimd),
            STACKER,
            vm.addr(SIGNER_KEY),
            QUESTION_CHAIN,
            BOND,
            COOLDOWN
        );
        bimd.mint(applicant, 100e18);
        bimd.mint(challenger, 100e18);
        vm.prank(applicant);
        bimd.approve(address(breg), type(uint256).max);
        vm.prank(challenger);
        bimd.approve(address(breg), type(uint256).max);
    }

    function _signFor(ProjectRegistry r, OracleAttestation.Attestation memory a)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(SIGNER_KEY, r.attestationDigest(a));
        return abi.encodePacked(rr, s, v);
    }

    function _listOn(ProjectRegistry r) internal returns (bytes32 id) {
        vm.prank(applicant);
        id = r.applyListing(project, "PLEA", "https://github.com/khaed1/plea", 50, beneficiary);
        OracleAttestation.Attestation memory a = _attestation(true);
        assertTrue(intake.deliver(id, a, _signFor(r, a), MAINNET_CALLBACK_GAS));
        assertTrue(r.isListed(project));
    }

    /// @dev A beneficiary the token refuses to pay cannot be paid its defended bond: the callback
    /// reverts inside the Intake's try, the project stays listed, and the challenger's bond is
    /// not stranded, because `expire` returns it to the challenger once the Intake has completed
    /// the request. Nobody else's funds move.
    function test_blockedBeneficiary_defenceFailsButTheBondIsNotStranded() public {
        _blocklistFixture();
        _listOn(breg);
        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(challenger);
        bytes32 id = breg.challenge(project, "Review the fee split.");
        bimd.block_(beneficiary, true);
        uint256 challengerBefore = bimd.balanceOf(challenger);

        OracleAttestation.Attestation memory a = _attestation(true);
        assertFalse(
            intake.deliver(id, a, _signFor(breg, a), MAINNET_CALLBACK_GAS), "payout reverts"
        );
        assertEq(bimd.balanceOf(address(breg)), BOND, "bond still held");
        assertEq(uint8(breg.projectOf(project).ask), uint8(ProjectRegistry.Ask.Challenge));
        assertFalse(breg.consumed(a.requestId), "the failed delivery consumed nothing");

        breg.expire(project);
        assertEq(bimd.balanceOf(challenger), challengerBefore + BOND, "bond back to the challenger");
        assertEq(bimd.balanceOf(beneficiary), 0);
        assertEq(bimd.balanceOf(address(breg)), 0);
        assertTrue(breg.isListed(project), "a failed defence does not delist");
        // The project can be challenged again at once; a defence then pays once unblocked.
        bimd.block_(beneficiary, false);
        vm.prank(challenger);
        id = breg.challenge(project, "Review again.");
        a = _attestation(true);
        assertTrue(intake.deliver(id, a, _signFor(breg, a), MAINNET_CALLBACK_GAS));
        assertEq(bimd.balanceOf(beneficiary), BOND);
    }

    /// @dev A blocked applicant is no problem at all: an application moves no bond.
    function test_blockedApplicant_canStillBeAnsweredAndListed() public {
        _blocklistFixture();
        vm.prank(applicant);
        bytes32 id =
            breg.applyListing(project, "PLEA", "https://github.com/khaed1/plea", 50, beneficiary);
        bimd.block_(applicant, true);
        OracleAttestation.Attestation memory a = _attestation(true);
        assertTrue(intake.deliver(id, a, _signFor(breg, a), MAINNET_CALLBACK_GAS));
        assertTrue(breg.isListed(project));
    }

    /// @dev The panel checks are minimums: a larger panel with a larger quorum is accepted as long
    /// as the agreement reaches both the registry's quorum and the panel's own.
    function test_largerPanelThanAskedIsAccepted() public {
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        a.panelSize = 30;
        a.quorum = 20;
        a.agreed = 20;
        assertTrue(intake.deliver(id, a, _sign(a, SIGNER_KEY), MAINNET_CALLBACK_GAS));
        assertTrue(reg.isListed(project));
    }

    /// forge-config: default.fuzz.runs = 500
    /// @dev Exactly the boundary of every panel field: 15/11/11 settles; one less in any of the
    /// three refuses with WrongPanel; agreement below the signed quorum refuses even above 11.
    function testFuzz_panelBoundaries(uint16 panel, uint16 quorum, uint16 agreed) public {
        panel = uint16(bound(panel, 13, 17));
        quorum = uint16(bound(quorum, 9, 13));
        agreed = uint16(bound(agreed, 9, 14));
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        a.panelSize = panel;
        a.quorum = quorum;
        a.agreed = agreed;
        bool ok = panel >= 15 && quorum >= 11 && agreed >= 11 && agreed >= quorum;
        bytes memory sig = _sign(a, SIGNER_KEY);
        if (!ok) {
            vm.prank(address(intake));
            vm.expectRevert(ProjectRegistry.WrongPanel.selector);
            reg.onOracleResult(id, a, sig);
            assertFalse(reg.isListed(project));
        } else {
            assertTrue(intake.deliver(id, a, sig, MAINNET_CALLBACK_GAS));
            assertTrue(reg.isListed(project));
        }
    }

    /// @dev A registry deployed with a zero bond (allowed by the constructor) never transfers on
    /// settlement or expiry, so a challenge costs only the fee and nothing can be owed.
    function test_zeroBondRegistry_neverTransfersOnSettlement() public {
        ProjectRegistry z = new ProjectRegistry(
            address(intake), address(imd), STACKER, vm.addr(SIGNER_KEY), QUESTION_CHAIN, 0, COOLDOWN
        );
        vm.prank(applicant);
        imd.approve(address(z), type(uint256).max);
        vm.prank(challenger);
        imd.approve(address(z), type(uint256).max);
        _listOn(z);
        vm.warp(block.timestamp + COOLDOWN);
        uint256 before = imd.balanceOf(challenger);
        vm.prank(challenger);
        bytes32 id = z.challenge(project, "Review it.");
        assertEq(before - imd.balanceOf(challenger), 0.5e18, "fee only");
        assertEq(imd.balanceOf(address(z)), 0);
        OracleAttestation.Attestation memory a = _attestation(true);
        assertTrue(intake.deliver(id, a, _signFor(z, a), MAINNET_CALLBACK_GAS));
        assertEq(imd.balanceOf(beneficiary), 0, "nothing to pay");
        vm.prank(challenger);
        id = z.challenge(project, "Again.");
        vm.warp(block.timestamp + 1 days + 1);
        z.expire(project);
        assertEq(imd.balanceOf(challenger), before - 1e18);
        assertEq(imd.balanceOf(address(z)), 0);
    }

    /// @dev Two registries sharing one signer and one Intake: an answer signed for one of them is
    /// refused by the other, and each registry consumes its own UUIDs independently.
    function test_twoRegistriesDoNotShareAnswersOrConsumption() public {
        ProjectRegistry two = new ProjectRegistry(
            address(intake),
            address(imd),
            STACKER,
            vm.addr(SIGNER_KEY),
            QUESTION_CHAIN,
            BOND,
            COOLDOWN
        );
        vm.prank(applicant);
        imd.approve(address(two), type(uint256).max);
        bytes32 idOne = _apply();
        vm.prank(applicant);
        bytes32 idTwo =
            two.applyListing(project, "PLEA", "https://github.com/khaed1/plea", 50, beneficiary);
        OracleAttestation.Attestation memory a = _attestation(true);
        bytes memory sigOne = _sign(a, SIGNER_KEY);
        bytes memory sigTwo = _signFor(two, a);
        assertFalse(intake.deliver(idTwo, a, sigOne, MAINNET_CALLBACK_GAS), "wrong domain");
        assertTrue(intake.deliver(idOne, a, sigOne, MAINNET_CALLBACK_GAS));
        assertTrue(reg.consumed(a.requestId));
        assertFalse(two.consumed(a.requestId), "consumption is per registry");
        // The same UUID signed for the second registry still settles there: a shared signer
        // reusing a request id across consumers is the signer's bug, not something the registry
        // can see, so this is by design and recorded here as such.
        two.expire(project); // the failed delivery completed the request at the Intake
        vm.prank(applicant);
        idTwo = two.applyListing(project, "PLEA", "https://github.com/khaed1/plea", 50, beneficiary);
        a.issuedAt = uint64(block.timestamp);
        sigTwo = _signFor(two, a);
        assertTrue(intake.deliver(idTwo, a, sigTwo, MAINNET_CALLBACK_GAS));
        assertTrue(two.isListed(project));
    }
}
