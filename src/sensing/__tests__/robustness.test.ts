/**
 * Characterisation of the classifier across movement scenarios.
 *
 * This is the evidence behind the claim that Lode separates human gait
 * from everything else. It asserts the separation holds, and prints the
 * table that documents it.
 *
 * Run with `npx jest robustness --verbose` to see the readout.
 */
import { extractFeatures, motionEnergy } from '../features';
import { scoreConfidence } from '../confidence';
import { CONFIDENCE_THRESHOLD } from '../bands';
import { SCENARIOS } from './scenarios';

type Row = {
  name: string;
  human: boolean;
  score: number;
  credited: boolean;
  correct: boolean;
};

function run(): Row[] {
  return SCENARIOS.map((s) => {
    const w = s.window();
    const c = scoreConfidence(extractFeatures(w), motionEnergy(w));
    return {
      name: s.name,
      human: s.human,
      score: c.score,
      credited: c.verified,
      correct: c.verified === s.human,
    };
  });
}

describe('classifier robustness', () => {
  const rows = run();
  const humans = rows.filter((r) => r.human);
  const others = rows.filter((r) => !r.human);

  it('credits every form of genuine walking', () => {
    const missed = humans.filter((r) => !r.credited).map((r) => r.name);
    expect(missed).toEqual([]);
  });

  it('refuses every attack and every non-gait movement', () => {
    const slipped = others.filter((r) => r.credited).map((r) => r.name);
    expect(slipped).toEqual([]);
  });

  it('keeps a usable margin between the two groups', () => {
    const worstHuman = Math.min(...humans.map((r) => r.score));
    const bestOther = Math.max(...others.map((r) => r.score));
    // A narrow margin means real walking will sometimes dip below the line
    // on a device whose sensors differ slightly from these models.
    expect(worstHuman - bestOther).toBeGreaterThan(0.15);
  });

  it('prints the table', () => {
    const fp = others.filter((r) => r.credited).length;
    const fn = humans.filter((r) => !r.credited).length;
    const lines = [
      '',
      `  threshold ${CONFIDENCE_THRESHOLD}`,
      '',
      '  scenario                          expected  score  verdict',
      '  ' + '-'.repeat(58),
      ...rows.map(
        (r) =>
          `  ${r.name.padEnd(34)}${(r.human ? 'human' : 'not').padEnd(10)}` +
          `${r.score.toFixed(3).padStart(5)}  ${r.credited ? 'CREDITED' : 'refused '}` +
          `  ${r.correct ? '' : '  <-- WRONG'}`,
      ),
      '  ' + '-'.repeat(58),
      `  false positives ${fp}/${others.length}   false negatives ${fn}/${humans.length}`,
      `  worst human ${Math.min(...humans.map((r) => r.score)).toFixed(3)}` +
        `   best non-human ${Math.max(...others.map((r) => r.score)).toFixed(3)}`,
      '',
    ];
    console.log(lines.join('\n'));
    expect(rows).toHaveLength(SCENARIOS.length);
  });
});
