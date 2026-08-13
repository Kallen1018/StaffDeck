import type { ComponentType, SVGProps } from 'react';

import CodeBlock from '@/components/CodeBlock';
import MindStaffIcon from '@/components/MindStaffIcon';
import IconCotAdvance from '@/assets/mindstaff/cot-icons/advance.svg?react';
import IconCotExecute from '@/assets/mindstaff/cot-icons/execute.svg?react';
import IconCotGenerated from '@/assets/mindstaff/cot-icons/generated.svg?react';
import IconCotJudge from '@/assets/mindstaff/cot-icons/judge.svg?react';
import IconCotLoading from '@/assets/mindstaff/cot-icons/loading.svg?react';
import IconCotSelect from '@/assets/mindstaff/cot-icons/select.svg?react';
import IconCotTool from '@/assets/mindstaff/cot-icons/tool.svg?react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

import {
  CHAT_TRACE_CHEVRON_CLASS,
  CHAT_TRACE_CHEVRON_EXPANDED_CLASS,
  CHAT_TRACE_CODE_BLOCK_CLASS,
  CHAT_TRACE_CODE_DETAILS_CLASS,
  CHAT_TRACE_CODE_SUMMARY_CLASS,
  CHAT_TRACE_DETAILS_CLASS,
  CHAT_TRACE_FLOW_TEXT_CLASS,
  CHAT_TRACE_ICON_CLASS,
  CHAT_TRACE_ICON_RUNNING_CLASS,
  CHAT_TRACE_LINE_CLASS,
  CHAT_TRACE_LINE_CONTENT_CLASS,
  CHAT_TRACE_LINE_DETAIL_CLASS,
  CHAT_TRACE_LINE_TEXT_CLASS,
  CHAT_TRACE_LINE_TEXT_FAILED_CLASS,
  CHAT_TRACE_SUMMARY_CLASS,
  CHAT_TRACE_SUMMARY_FAILED_CLASS,
  CHAT_TRACE_SUMMARY_RUNNING_CLASS,
  CHAT_TRACE_WAITING_CLASS,
  CHAT_TRACE_WAITING_DOT_CLASS,
  CHAT_TRACE_WAITING_DOTS_CLASS,
  CHAT_TRACE_WAITING_TEXT_CLASS,
  CHAT_TRACE_WRAP_CLASS,
} from '../chatPageStyles';
import { traceLineIconName, traceSummaryIconName } from '../chatHelpers';
import type { CotTraceIconName, TraceLine } from '../chatTypes';

const COT_ICON_MAP: Record<CotTraceIconName, ComponentType<SVGProps<SVGSVGElement>>> = {
  advance: IconCotAdvance,
  execute: IconCotExecute,
  generated: IconCotGenerated,
  judge: IconCotJudge,
  loading: IconCotLoading,
  select: IconCotSelect,
  tool: IconCotTool,
};

function CotTraceIcon({ name, className }: { name: CotTraceIconName; className?: string }) {
  const Icon = COT_ICON_MAP[name];
  return (
    <span className={cn(CHAT_TRACE_ICON_CLASS, className)} aria-hidden="true">
      <Icon />
    </span>
  );
}

type ExecutionRecordProps = {
  traceTurnId: string;
  summary: { text: string; state: TraceLine['state'] };
  details: TraceLine[];
  expanded: boolean;
  onToggle: (turnId: string, isExpanded: boolean) => void;
};

export default function ExecutionRecord({
  traceTurnId,
  summary,
  details,
  expanded,
  onToggle,
}: ExecutionRecordProps) {
  const { t } = useI18n();
  const running = summary.state === 'running';

  return (
    <div className={CHAT_TRACE_WRAP_CLASS}>
      <button
        type="button"
        className={cn(
          CHAT_TRACE_SUMMARY_CLASS,
          summary.state === 'running' && CHAT_TRACE_SUMMARY_RUNNING_CLASS,
          summary.state === 'failed' && CHAT_TRACE_SUMMARY_FAILED_CLASS,
        )}
        onClick={() => onToggle(traceTurnId, expanded)}
      >
        <CotTraceIcon
          name={traceSummaryIconName(summary)}
          className={running ? CHAT_TRACE_ICON_RUNNING_CLASS : undefined}
        />
        <span className={cn(running && CHAT_TRACE_FLOW_TEXT_CLASS)}>{t(summary.text)}</span>
        {details.length > 0 && (
          <MindStaffIcon
            name="arrow"
            size={14}
            className={cn(CHAT_TRACE_CHEVRON_CLASS, expanded && CHAT_TRACE_CHEVRON_EXPANDED_CLASS)}
          />
        )}
      </button>
      {expanded && (details.length > 0 || running) && (
        <div className={CHAT_TRACE_DETAILS_CLASS}>
          {details.map((line) => (
            <div key={line.id} className={CHAT_TRACE_LINE_CLASS}>
              <CotTraceIcon
                name={traceLineIconName(line)}
                className={line.state === 'running' ? CHAT_TRACE_ICON_RUNNING_CLASS : undefined}
              />
              <span className={CHAT_TRACE_LINE_CONTENT_CLASS}>
                <span
                  className={cn(
                    CHAT_TRACE_LINE_TEXT_CLASS,
                    line.state === 'running' && CHAT_TRACE_FLOW_TEXT_CLASS,
                    line.state === 'failed' && CHAT_TRACE_LINE_TEXT_FAILED_CLASS,
                  )}
                >
                  {t(line.text)}
                </span>
                {line.detail && <span className={CHAT_TRACE_LINE_DETAIL_CLASS}>{t(line.detail)}</span>}
                {line.code && (
                  <details className={CHAT_TRACE_CODE_DETAILS_CLASS}>
                    <summary className={CHAT_TRACE_CODE_SUMMARY_CLASS}>查看代码</summary>
                    <CodeBlock className={CHAT_TRACE_CODE_BLOCK_CLASS} code={line.code} language={line.language || 'python'} />
                  </details>
                )}
                {line.output && (
                  <details className={CHAT_TRACE_CODE_DETAILS_CLASS}>
                    <summary className={CHAT_TRACE_CODE_SUMMARY_CLASS}>{t(line.outputTitle || '查看输出')}</summary>
                    <CodeBlock className={CHAT_TRACE_CODE_BLOCK_CLASS} code={line.output} language={line.outputLanguage || 'text'} />
                  </details>
                )}
              </span>
            </div>
          ))}
          {running && (
            <div className={CHAT_TRACE_WAITING_CLASS} role="status">
              <span className={CHAT_TRACE_WAITING_DOTS_CLASS}>
                <span className={CHAT_TRACE_WAITING_DOT_CLASS} />
                <span className={CHAT_TRACE_WAITING_DOT_CLASS} />
                <span className={CHAT_TRACE_WAITING_DOT_CLASS} />
              </span>
              <span className={CHAT_TRACE_WAITING_TEXT_CLASS}>{t('处理中')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
