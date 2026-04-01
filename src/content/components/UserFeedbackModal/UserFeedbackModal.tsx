// src/content/components/UserFeedbackModal/UserFeedbackModal.tsx
import React, { useCallback, useState } from 'react';
import { useSetAtom } from 'jotai';
import { showUserFeedbackModalAtom } from '@/store/uiAtoms';
import { UserFeedbackService } from '@/api-services/UserFeedbackService';
import { UserFeedbackVerdict } from '@/api-services/dto/UserFeedbackDTO';
import type { UserFeedbackQnA } from '@/api-services/dto/UserFeedbackDTO';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';

export interface UserFeedbackModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Pass true when rendered inside Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
}

interface VerdictOption {
  verdict: UserFeedbackVerdict;
  emoji: string;
  label: string;
  /** Bold question shown in the follow-up textbox */
  question: string;
  /** Softer supporting hint shown below the question */
  hint: string;
  /** Placeholder text for the main textarea */
  placeholder: string;
  /** Whether to show profession input */
  showProfession: boolean;
  /** Label for the profession input, shown below the textarea */
  professionLabel: string;
}

const VERDICT_OPTIONS: VerdictOption[] = [
  {
    verdict: UserFeedbackVerdict.UNHAPPY,
    emoji: '😞',
    label: 'Unhappy',
    question: 'What went wrong? We\'ll fix it in a few days.',
    hint: 'Your experience matters — we\'re always here to make it right.',
    placeholder: 'Tell us what didn\'t work as expected…',
    showProfession: false,
    professionLabel: '',
  },
  {
    verdict: UserFeedbackVerdict.NEUTRAL,
    emoji: '😐',
    label: 'Neutral',
    question: 'How can we make Xplaino more tailored to you?',
    hint: '',
    placeholder: 'Any feedback is helpful…',
    showProfession: true,
    professionLabel: 'Your profession (optional) — helps us personalise better',
  },
  {
    verdict: UserFeedbackVerdict.HAPPY,
    emoji: '😊',
    label: 'Happy',
    question: 'Any way we can personalise it further for you?',
    hint: 'Sharing your profession helps us customise Xplaino even more.',
    placeholder: 'We\'d love to make it even better for you…',
    showProfession: true,
    professionLabel: 'Your profession (optional)',
  },
];

export const UserFeedbackModal: React.FC<UserFeedbackModalProps> = ({
  visible,
  useShadowDom = false,
}) => {
  const setShowModal = useSetAtom(showUserFeedbackModalAtom);

  const [selectedVerdict, setSelectedVerdict] = useState<UserFeedbackVerdict | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [profession, setProfession] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedOption = VERDICT_OPTIONS.find((o) => o.verdict === selectedVerdict) ?? null;

  const cn = useCallback(
    (name: string) => (useShadowDom ? name : name),
    [useShadowDom]
  );

  const handleVerdictSelect = useCallback((verdict: UserFeedbackVerdict) => {
    setSelectedVerdict(verdict);
    setFeedbackText('');
    setProfession('');
    setErrorMsg('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedVerdict || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');

    const qna: UserFeedbackQnA[] = [];

    if (selectedOption && feedbackText.trim()) {
      qna.push({
        question: selectedOption.question,
        answer: feedbackText.trim(),
      });
    }

    if (selectedOption?.showProfession && profession.trim()) {
      qna.push({
        question: 'What is your profession?',
        answer: profession.trim(),
      });
    }

    await UserFeedbackService.submitFeedback(
      {
        verdict: selectedVerdict,
        metadata: { qna },
      },
      {
        onSuccess: async () => {
          await ChromeStorage.setHasFeedbackSubmitted(true);
          setShowModal(false);
        },
        onError: (_code, message) => {
          setIsSubmitting(false);
          setErrorMsg(message || 'Something went wrong. Please try again.');
        },
        onLoginRequired: () => {
          setIsSubmitting(false);
          setErrorMsg('Please log in to submit feedback.');
        },
      }
    );
  }, [selectedVerdict, selectedOption, feedbackText, profession, isSubmitting, setShowModal]);

  if (!visible) return null;

  return (
    <div className={cn('feedbackModalOverlay')}>
      <div className={cn('feedbackModalCard')}>

        {/* Title */}
        <h2 className={cn('feedbackModalTitle')}>How is your experience with Xplaino?</h2>
        <p className={cn('feedbackModalSubtitle')}>
          Takes 30 seconds — your input shapes the product.
        </p>

        {/* Verdict selector */}
        <div className={cn('feedbackVerdictRow')}>
          {VERDICT_OPTIONS.map((option) => (
            <button
              key={option.verdict}
              type="button"
              className={`${cn('feedbackVerdictCard')}${selectedVerdict === option.verdict ? ` ${cn('selected')}` : ''}`}
              onClick={() => handleVerdictSelect(option.verdict)}
            >
              <span className={cn('feedbackVerdictEmoji')}>{option.emoji}</span>
              <span className={cn('feedbackVerdictLabel')}>{option.label}</span>
            </button>
          ))}
        </div>

        {/* Follow-up section — appears when verdict is selected */}
        {selectedOption && (
          <div className={cn('feedbackFollowUp')}>
            <p className={cn('feedbackFollowUpQuestion')}>{selectedOption.question}</p>
            {selectedOption.hint ? (
              <p className={cn('feedbackFollowUpHint')}>{selectedOption.hint}</p>
            ) : null}
            <textarea
              className={cn('feedbackTextarea')}
              placeholder={selectedOption.placeholder}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {/* Profession input — only for NEUTRAL and HAPPY */}
        {selectedOption?.showProfession && (
          <div className={cn('feedbackProfessionWrap')}>
            <label className={cn('feedbackProfessionLabel')}>
              {selectedOption.professionLabel}
            </label>
            <input
              type="text"
              className={cn('feedbackProfessionInput')}
              placeholder="e.g. Student, Engineer, Researcher…"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            />
          </div>
        )}

        {/* Inline error */}
        {errorMsg ? (
          <p className={cn('feedbackErrorMsg')}>{errorMsg}</p>
        ) : null}

        {/* Submit button */}
        <button
          type="button"
          className={`${cn('feedbackSubmitBtn')}${isSubmitting ? ` ${cn('loading')}` : ''}`}
          disabled={!selectedVerdict || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <>
              <span className={cn('feedbackSpinner')} />
              Submitting…
            </>
          ) : (
            'Submit Feedback'
          )}
        </button>

      </div>
    </div>
  );
};

UserFeedbackModal.displayName = 'UserFeedbackModal';
