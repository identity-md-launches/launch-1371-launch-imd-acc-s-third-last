// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {RegistryBase} from "./ProjectRegistry.t.sol";
import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {OracleAttestation, OracleAttestationConsumer} from "../src/oracle/OracleAttestation.sol";

/// @dev An ERC-1271 signer that answers for the keys it lists: the library's "natural rotation
/// story". Not deployed by this launch (the Sepolia signer is a bare key); here it exercises the
/// fallback branch of `_verifyAttestation` that the bare key never reaches.
contract KeyRegistry1271 {
    mapping(address => bool) public allowed;

    function allow(address key, bool ok) external {
        allowed[key] = ok;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature)
        external
        view
        returns (bytes4)
    {
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(hash, signature);
        return
            (err == ECDSA.RecoverError.NoError && allowed[recovered])
                ? bytes4(0x1626ba7e)
                : bytes4(0);
    }
}

contract Reverting1271 {
    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        revert("no");
    }
}

/// @dev Returns the magic value as the *wrong* type width, as a sloppy signer might.
contract ShortReturn1271 {
    fallback(bytes calldata) external returns (bytes memory) {
        return abi.encodePacked(bytes4(0x1626ba7e));
    }
}

/// @dev Who may settle a question: the branches of `OracleAttestationConsumer._verifyAttestation`
/// (ECDSA first, then ERC-1271), signature encodings the writer might send, and the fact that
/// the registry exposes nothing that could change the signer after deployment.
contract RegistrySignerAuthorityTest is RegistryBase {
    uint256 internal constant OTHER_KEY = 0xB0B;
    /// @dev secp256k1 group order.
    uint256 internal constant N =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    function _deployWithSigner(address signer) internal returns (ProjectRegistry r) {
        r = new ProjectRegistry(
            address(intake), address(imd), STACKER, signer, QUESTION_CHAIN, BOND, COOLDOWN
        );
        vm.prank(applicant);
        imd.approve(address(r), type(uint256).max);
    }

    function _applyTo(ProjectRegistry r) internal returns (bytes32 id) {
        vm.prank(applicant);
        id = r.applyListing(project, "PLEA", "https://github.com/khaed1/plea", 50, beneficiary);
    }

    function _signFor(ProjectRegistry r, OracleAttestation.Attestation memory a, uint256 key)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(key, r.attestationDigest(a));
        return abi.encodePacked(rr, s, v);
    }

    // ───────────────────────── bare key (the launch's case) ─────────────────────────

    /// @dev With a bare key as signer, a contract-signature path does not exist: the key's
    /// address has no code, so a signature by any other key fails at both branches.
    function test_bareKeySigner_hasNoContractPath() public {
        assertEq(reg.oracleSigner().code.length, 0);
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        bytes memory sig = _sign(a, OTHER_KEY);
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, sig);
    }

    /// @dev A high-s twin of a valid signature recovers the same key under raw ecrecover; OZ's
    /// ECDSA refuses it, and the fallback has nowhere to go. The writer must send canonical s.
    function test_malleableHighSSignatureIsRefused() public {
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, reg.attestationDigest(a));
        bytes32 sHigh = bytes32(N - uint256(s));
        uint8 vFlip = v == 27 ? 28 : 27;
        // Sanity: raw ecrecover accepts the twin, so the refusal below is the library's doing.
        assertEq(ecrecover(reg.attestationDigest(a), vFlip, r, sHigh), vm.addr(SIGNER_KEY));
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, abi.encodePacked(r, sHigh, vFlip));
        // The canonical one still settles the same question.
        assertTrue(intake.deliver(id, a, abi.encodePacked(r, s, v), MAINNET_CALLBACK_GAS));
        assertTrue(reg.isListed(project));
    }

    /// @dev EIP-2098 compact (64-byte) signatures are valid ECDSA but not what `tryRecover(bytes)`
    /// takes: the writer has to send 65 bytes. A compact one is refused rather than misread.
    function test_compactSignatureIsRefused() public {
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, reg.attestationDigest(a));
        bytes32 vs = bytes32(uint256(s) | (uint256(v - 27) << 255));
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, abi.encodePacked(r, vs));
        assertFalse(reg.isListed(project));
    }

    /// @dev v given as 0/1 instead of 27/28 is refused too (OZ recovers nobody for it).
    function test_zeroBasedVIsRefused() public {
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, reg.attestationDigest(a));
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, abi.encodePacked(r, s, uint8(v - 27)));
    }

    /// @dev If the signer key is ever delegated (EIP-7702) its address has code, and
    /// `SignatureChecker` alone would go to that code instead of the key. The library checks
    /// ECDSA first, so the key's own signature still settles even when its code would reject it.
    function test_signerKeyWithDelegatedCodeStillSettlesByECDSA() public {
        vm.etch(vm.addr(SIGNER_KEY), address(new Reverting1271()).code);
        assertGt(reg.oracleSigner().code.length, 0);
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        assertTrue(intake.deliver(id, a, _sign(a, SIGNER_KEY), MAINNET_CALLBACK_GAS));
        assertTrue(reg.isListed(project));
        // And the code's answer does not widen who may sign: another key is still refused.
        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(challenger);
        id = reg.challenge(project, "Review it.");
        a = _attestation(false);
        bytes memory sig = _sign(a, OTHER_KEY);
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, sig);
        assertTrue(reg.isListed(project));
    }

    // ───────────────────────── contract signer (ERC-1271) ─────────────────────────

    function test_erc1271Signer_acceptsItsListedKeyAndRotatesWithoutRedeploy() public {
        KeyRegistry1271 keys = new KeyRegistry1271();
        keys.allow(vm.addr(SIGNER_KEY), true);
        ProjectRegistry r = _deployWithSigner(address(keys));
        assertEq(r.oracleSigner(), address(keys));

        bytes32 id = _applyTo(r);
        OracleAttestation.Attestation memory a = _attestation(true);
        // An unlisted key is refused by the registry of keys.
        bytes memory sig = _signFor(r, a, OTHER_KEY);
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        r.onOracleResult(id, a, sig);
        // The listed key settles through the ERC-1271 branch.
        assertTrue(intake.deliver(id, a, _signFor(r, a, SIGNER_KEY), MAINNET_CALLBACK_GAS));
        assertTrue(r.isListed(project));

        // Rotation: list the new key, drop the old one. The registry contract is untouched.
        keys.allow(vm.addr(SIGNER_KEY), false);
        keys.allow(vm.addr(OTHER_KEY), true);
        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(challenger);
        imd.approve(address(r), type(uint256).max);
        vm.prank(challenger);
        id = r.challenge(project, "Review it.");
        a = _attestation(false);
        sig = _signFor(r, a, SIGNER_KEY);
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        r.onOracleResult(id, a, sig);
        assertTrue(intake.deliver(id, a, _signFor(r, a, OTHER_KEY), MAINNET_CALLBACK_GAS));
        assertFalse(r.isListed(project));
    }

    /// @dev A signer contract that reverts, or that returns the magic value in the wrong shape,
    /// is a refusal (`BadSignature`), never a bubbled revert or a false acceptance.
    function test_erc1271Signer_revertingOrMalformedAnswersAreRefusals() public {
        ProjectRegistry r = _deployWithSigner(address(new Reverting1271()));
        bytes32 id = _applyTo(r);
        OracleAttestation.Attestation memory a = _attestation(true);
        bytes memory sig = _signFor(r, a, SIGNER_KEY);
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        r.onOracleResult(id, a, sig);

        ProjectRegistry r2 = _deployWithSigner(address(new ShortReturn1271()));
        id = _applyTo(r2);
        sig = _signFor(r2, a, SIGNER_KEY);
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        r2.onOracleResult(id, a, sig);
        assertFalse(r2.isListed(project));
    }

    /// @dev The ERC-1271 branch is only consulted for the configured signer. A valid ERC-1271
    /// answer from some other contract (one the attacker controls) is never asked for.
    function test_attackersOwnContractSignerIsNeverConsulted() public {
        KeyRegistry1271 theirs = new KeyRegistry1271();
        theirs.allow(vm.addr(OTHER_KEY), true);
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        bytes memory sig = _sign(a, OTHER_KEY);
        assertEq(
            theirs.isValidSignature(reg.attestationDigest(a), sig),
            bytes4(0x1626ba7e),
            "their contract would vouch for it"
        );
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, sig);
    }

    // ───────────────────────── nothing changes the signer ─────────────────────────

    function test_noFunctionChangesTheSigner() public {
        address before = reg.oracleSigner();
        string[3] memory setters =
            ["setOracleSigner(address)", "setSigner(address)", "rotateSigner(address)"];
        for (uint256 i; i < setters.length; ++i) {
            (bool ok,) = address(reg).call(abi.encodeWithSignature(setters[i], vm.addr(OTHER_KEY)));
            assertFalse(ok, setters[i]);
        }
        assertEq(reg.oracleSigner(), before);
    }

    /// forge-config: default.fuzz.runs = 500
    /// @dev Flipping any bit of a valid 65-byte signature yields a refusal, never a different
    /// acceptance, for the launch's bare-key signer.
    function testFuzz_anyCorruptedSignatureIsRefused(uint16 bit) public {
        bit = uint16(bound(bit, 0, 65 * 8 - 1));
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        bytes memory sig = _sign(a, SIGNER_KEY);
        sig[bit / 8] ^= bytes1(uint8(1) << uint8(bit % 8));
        vm.prank(address(intake));
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, sig);
        assertFalse(reg.isListed(project));
        assertEq(reg.projectOfIntake(id), project, "the question stays open for the real answer");
    }
}
