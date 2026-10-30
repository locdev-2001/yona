import { renderToString } from 'react-dom/server';

import type { LandingConfig } from './config';
import { Landing } from './Landing';

export function renderLanding(config: LandingConfig): string {
    return renderToString(<Landing config={config} />);
}
