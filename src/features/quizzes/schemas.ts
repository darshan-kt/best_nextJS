import { z } from "zod";

/**
 * Payload shapes for quiz questions (§18).
 *
 * `QuizQuestion.data` is `Json`, so — exactly like the lightweight
 * content-block payloads in `features/learning/schemas.ts` — it is external
 * input the moment it leaves the database and must be validated before
 * anything trusts its shape (§9). `response Json` on `QuizAnswer` is the
 * same story from the other direction: a learner's submitted answer is a
 * request body, not a trusted value, whichever question it claims to
 * answer.
 *
 * One schema pair per `QuestionType` — a *data* schema (the question's own
 * definition, including the correct answer, read only ever on the server)
 * and a *value* schema (the shape a learner's response must have). Adding a
 * fifth question type is one more pair here plus one more case in
 * `scoring.ts` and the question-renderer switch, not a change scattered
 * across the quiz feature (§18).
 */

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const choiceDataSchema = z
  .object({
    options: z.array(optionSchema).min(2),
    correctOptionIds: z.array(z.string().min(1)).min(1),
  })
  .refine(
    (data) =>
      data.correctOptionIds.every((id) =>
        data.options.some((option) => option.id === id)
      ),
    { message: "correctOptionIds must reference real options" }
  );
export type ChoiceData = z.infer<typeof choiceDataSchema>;

export const trueFalseDataSchema = z.object({
  correctAnswer: z.boolean(),
});
export type TrueFalseData = z.infer<typeof trueFalseDataSchema>;

export const shortAnswerDataSchema = z.object({
  acceptedAnswers: z.array(z.string().min(1)).min(1),
});
export type ShortAnswerData = z.infer<typeof shortAnswerDataSchema>;

/**
 * One schema per type, keyed the same way `scoring.ts`'s switch is —
 * SINGLE_CHOICE and MULTIPLE_CHOICE share a shape because the only
 * difference between them is *how many* correct options there are, not
 * what an option looks like.
 */
export const questionDataSchemas = {
  SINGLE_CHOICE: choiceDataSchema,
  MULTIPLE_CHOICE: choiceDataSchema,
  TRUE_FALSE: trueFalseDataSchema,
  SHORT_ANSWER: shortAnswerDataSchema,
} as const;

// --- Response ("value") shapes ----------------------------------------------

export const singleChoiceValueSchema = z.object({
  selectedOptionId: z.string().min(1),
});
export type SingleChoiceValue = z.infer<typeof singleChoiceValueSchema>;

export const multipleChoiceValueSchema = z.object({
  selectedOptionIds: z.array(z.string().min(1)).max(50),
});
export type MultipleChoiceValue = z.infer<typeof multipleChoiceValueSchema>;

export const trueFalseValueSchema = z.object({
  answer: z.boolean(),
});
export type TrueFalseValue = z.infer<typeof trueFalseValueSchema>;

export const shortAnswerValueSchema = z.object({
  text: z.string().max(2000),
});
export type ShortAnswerValue = z.infer<typeof shortAnswerValueSchema>;

export const questionValueSchemas = {
  SINGLE_CHOICE: singleChoiceValueSchema,
  MULTIPLE_CHOICE: multipleChoiceValueSchema,
  TRUE_FALSE: trueFalseValueSchema,
  SHORT_ANSWER: shortAnswerValueSchema,
} as const;

/**
 * The Server Action's input shape: one attempt's worth of raw responses,
 * keyed by question id. `value` is deliberately `unknown` here — it is
 * validated against the *real* question's type, looked up server-side, in
 * `submit-quiz-attempt.ts`, not against a type the client claims (§9, §12:
 * never trust a client-asserted type for a security-relevant decision).
 */
export const quizResponseEnvelopeSchema = z.object({
  quizId: z.string().min(1),
  courseSlug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/i, "Invalid course"),
  lessonSlug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/i, "Invalid lesson"),
  responses: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: z.unknown(),
      })
    )
    .max(200),
});
export type QuizResponseEnvelope = z.infer<typeof quizResponseEnvelopeSchema>;
