import type { Page } from 'playwright';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function randomMouseMove(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) return;

  const steps = randomInt(3, 8);
  for (let i = 0; i < steps; i++) {
    const x = randomInt(50, viewport.width - 50);
    const y = randomInt(50, viewport.height - 50);
    await page.mouse.move(x, y, { steps: randomInt(5, 15) });
    await sleep(randomInt(50, 200));
  }
}

export async function randomScroll(page: Page): Promise<void> {
  const scrolls = randomInt(2, 6);
  for (let i = 0; i < scrolls; i++) {
    const delta = randomInt(100, 500);
    const direction = Math.random() > 0.2 ? 1 : -1; // mostly scroll down
    await page.mouse.wheel(0, delta * direction);
    await sleep(randomInt(300, 1500));
  }
}

export async function randomClick(page: Page): Promise<boolean> {
  try {
    const links = await page.$$('a[href]:not([href^="javascript"]):not([href^="#"])');
    if (links.length === 0) return false;

    const link = links[randomInt(0, Math.min(links.length - 1, 20))];
    const isVisible = await link.isVisible().catch(() => false);
    if (!isVisible) return false;

    const box = await link.boundingBox();
    if (!box) return false;

    // Move to element with human-like trajectory
    await page.mouse.move(
      box.x + box.width / 2 + randomInt(-5, 5),
      box.y + box.height / 2 + randomInt(-5, 5),
      { steps: randomInt(8, 20) }
    );
    await sleep(randomInt(100, 300));
    await link.click({ delay: randomInt(50, 150) });
    return true;
  } catch {
    return false;
  }
}

export async function humanDelay(minMs: number, maxMs: number): Promise<void> {
  await sleep(randomInt(minMs, maxMs));
}

export async function emulateHumanBehavior(page: Page, durationSec: number): Promise<void> {
  const endTime = Date.now() + durationSec * 1000;

  while (Date.now() < endTime) {
    const action = Math.random();

    if (action < 0.4) {
      await randomScroll(page);
    } else if (action < 0.7) {
      await randomMouseMove(page);
    } else {
      await humanDelay(500, 2000);
    }

    await sleep(randomInt(200, 800));
  }
}
