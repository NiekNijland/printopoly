import type { Localized } from '../../types/game';
import type {
    CheckCode,
    CheckIssue,
    IssueIcon,
    Severity,
} from './checks-types';

const SEVERITY_LABEL: Record<Severity, Localized> = {
    warning: { nl: 'Waarschuwing', en: 'Warning' },
    error: { nl: 'Fout', en: 'Error' },
};
const ICON: Record<Severity, IssueIcon> = {
    warning: 'triangle-alert',
    error: 'octagon-x',
};
export const issue = (
    code: CheckCode,
    elementKey: string,
    field: string,
    severity: Severity,
    message: Localized,
    data?: CheckIssue['data'],
): CheckIssue => {
    return {
        id: `${code}|${elementKey}|${field}`,
        code,
        elementKey,
        field,
        severity,
        icon: ICON[severity],
        severityLabel: SEVERITY_LABEL[severity],
        message,
        ...(data ? { data } : {}),
    };
};
