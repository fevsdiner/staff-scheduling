import { TIME_INPUT_STEP_SECONDS } from "@/lib/schedule/time-input";
import type { ShiftSegmentValidation } from "@/lib/schedule/validate-segments";
import { MAX_SEGMENTS } from "@/lib/templates/types";

const inputBaseClassName =
  "h-9 rounded-lg border bg-surface-raised px-2 text-sm text-foreground";
const inputValidClassName = `${inputBaseClassName} border-border`;
const inputInvalidClassName = `${inputBaseClassName} border-red-500/60 ring-1 ring-red-500/30`;

interface ShiftSegmentFieldsProps {
  fieldId: string;
  formId?: string;
  segments: { timeIn: string; timeOut: string }[];
  validation: ShiftSegmentValidation;
  onSegmentChange: (
    index: number,
    field: "timeIn" | "timeOut",
    value: string,
  ) => void;
  onRemoveSegment: (index: number) => void;
  onAddSegment: () => void;
  addLabel?: string;
  highlightAll?: boolean;
}

export function ShiftSegmentFields({
  fieldId,
  formId,
  segments,
  validation,
  onSegmentChange,
  onRemoveSegment,
  onAddSegment,
  addLabel = "+ Add time",
  highlightAll = false,
}: ShiftSegmentFieldsProps) {
  return (
    <div className="space-y-1.5">
      {segments.map((segment, index) => {
        const segmentValidation =
          validation.segments[index] ?? {
            timeInError: false,
            timeOutError: false,
            message: null,
          };

        return (
          <div key={`${fieldId}-${index}`} className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5">
              <input
                form={formId}
                type="time"
                step={TIME_INPUT_STEP_SECONDS}
                name={`seg_${fieldId}_${index}_in`}
                value={segment.timeIn}
                onChange={(event) =>
                  onSegmentChange(index, "timeIn", event.target.value)
                }
                className={
                  segmentValidation.timeInError || highlightAll
                    ? inputInvalidClassName
                    : inputValidClassName
                }
                aria-invalid={
                  segmentValidation.timeInError || highlightAll ? true : undefined
                }
              />
              <span className="text-xs text-muted">→</span>
              <input
                form={formId}
                type="time"
                step={TIME_INPUT_STEP_SECONDS}
                name={`seg_${fieldId}_${index}_out`}
                value={segment.timeOut}
                onChange={(event) =>
                  onSegmentChange(index, "timeOut", event.target.value)
                }
                className={
                  segmentValidation.timeOutError || highlightAll
                    ? inputInvalidClassName
                    : inputValidClassName
                }
                aria-invalid={
                  segmentValidation.timeOutError || highlightAll ? true : undefined
                }
              />
              {segments.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemoveSegment(index)}
                  className="text-xs text-muted hover:text-red-300"
                  aria-label="Remove time block"
                >
                  ✕
                </button>
              ) : (
                <span className="w-3" />
              )}
            </div>
            {segmentValidation.message ? (
              <p className="text-xs text-red-300" role="alert">
                {segmentValidation.message}
              </p>
            ) : null}
          </div>
        );
      })}

      {segments.length < MAX_SEGMENTS ? (
        <button
          type="button"
          onClick={onAddSegment}
          className="text-xs font-medium text-accent hover:underline"
        >
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
