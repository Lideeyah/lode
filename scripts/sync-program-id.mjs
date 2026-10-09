/**
 * Copies the deployed program id from the Anchor keypair into the app, so
 * the two can never silently disagree. Run after any `anchor deploy` that
 * changes the id.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const PATH_TO = {
  keypair: 'program/target/deploy/lode-keypair.json',
  bindings: 'src/chain/program.ts',
  anchorToml: 'program/Anchor.toml',
};

const solana = `${process.env.HOME}/.local/share/solana/install/active_release/bin/solana-keygen`;
const id = execSync(`${solana} pubkey ${PATH_TO.keypair}`).toString().trim();

const bindings = readFileSync(PATH_TO.bindings, 'utf8');
const next = bindings.replace(
  /new PublicKey\('[^']*'\);(\s*\n)/,
  `new PublicKey('${id}');$1`,
);
if (next === bindings && !bindings.includes(id)) {
  console.error('Could not find LODE_PROGRAM_ID to replace in', PATH_TO.bindings);
  process.exit(1);
}
writeFileSync(PATH_TO.bindings, next);

const toml = readFileSync(PATH_TO.anchorToml, 'utf8');
writeFileSync(PATH_TO.anchorToml, toml.replace(/lode = "[^"]*"/, `lode = "${id}"`));

console.log('program id synced:', id);
