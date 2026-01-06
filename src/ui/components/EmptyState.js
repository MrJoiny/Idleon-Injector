import van from '../van-1.6.0.js';
import { Icons } from '../icons.js';

const { div, span } = van.tags;

export const EmptyState = ({ icon = Icons.CircleSlash(), title, subtitle = null }) => {
    return div({ class: 'empty-state' },
        span({ class: 'empty-state-icon' }, icon),
        div({ class: 'empty-state-title' }, title),
        subtitle ? div({ class: 'empty-state-subtitle' }, subtitle) : null
    );
};
