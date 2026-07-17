import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Text } from "@/src/shared/components/Text";

export interface FieldErrorProps {
  /**
   * Must be `${fieldId}-error` — the control points at it with
   * `aria-describedby`, which is what makes the message reach a screen-reader
   * user who has focused the field rather than heard the alert.
   */
  id: string;
  children: ReactNode;
}

/**
 * The inline error under a form control.
 *
 * Its own component because there are two renderers, not one: {@link FormField}
 * stacks label-above-control, while {@link CheckboxField} puts the label beside
 * the box and so builds its own layout. Both need an identical error, and
 * duplicating it is how the two quietly drift — the icon lands in one and the
 * next person to add a field component copies whichever they happened to open.
 *
 * `variant="danger"` rather than a `text-danger` className: `cn()` is a plain
 * join, so a colour passed via className is appended to the variant's colour
 * rather than replacing it, and loses the cascade. That is exactly how every
 * error in this app rendered near-white instead of red (velanto-frontend#236).
 */
export function FieldError({ id, children }: FieldErrorProps) {
  return (
    <Text
      variant="danger"
      id={id}
      role="alert"
      className="flex items-start gap-1.5 text-sm"
    >
      {/*
        Decoration only — aria-hidden. role="alert" already announces this node
        and the message already says what is wrong, so a named icon would just
        add noise to what gets read out.

        The wrapper is exactly one line tall (`h-[1lh]`) and centres the icon in
        it, which lands the icon on the FIRST line's optical centre. The two
        obvious alternatives are both wrong: `items-center` on the row centres
        against the whole block, so the icon drifts to the middle of a message
        that wraps (the 16+ rules error wraps to three lines on mobile), and
        `items-start` alone butts the icon against the top of the line box while
        the glyph sits centred within it — measured 2px high. `1lh` keeps that
        correct if the font size or leading ever changes, instead of freezing
        today's (20px - 14px) / 2 into a magic number.

        `shrink-0` stops the icon squashing when the text wraps.
      */}
      <span className="flex h-[1lh] shrink-0 items-center">
        <CircleAlert size={14} aria-hidden />
      </span>
      <span>{children}</span>
    </Text>
  );
}
