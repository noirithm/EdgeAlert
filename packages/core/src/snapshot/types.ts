export interface FocusInfo {
  tag: string;
  role: string | null;
  accessibleName: string | null;
  selector: string;
  isVisible: boolean;
  insideInert: boolean;
  insideAriaHidden: boolean;
  insideOpenDialog: boolean;
  isBody: boolean;
}

export interface DialogInfo {
  selector: string;
  role: 'dialog' | 'alertdialog';
  isNativeDialogElement: boolean;
  ariaModal: boolean;
  backgroundInert: boolean;
  backgroundAriaHidden: boolean;
}

export interface DisclosureInfo {
  selector: string;
  accessibleName: string | null;
  expanded: boolean;
  controlsSelector: string | null;
  controlsTargetExists: boolean;
  controlsTargetVisible: boolean | null;
}

export interface LiveRegionMutation {
  selector: string;
  role: string | null;
  ariaLive: string | null;
  ariaAtomic: boolean;
  ariaRelevant: string | null;
  textSnapshot: string;
  changedAt: number;
}

export interface ContentMutation {
  type: 'added' | 'removed' | 'text-changed';
  selector: string;
  summary: string;
}

export interface FormFieldIssue {
  selector: string;
  name: string | null;
  ariaInvalid: boolean;
  describedBySelectors: string[];
  errorMessageSelectors: string[];
  hasAssociatedError: boolean;
}

export interface ErrorSummaryInfo {
  selector: string;
  text: string;
}

export interface PageInfo {
  url: string;
  title: string;
  h1Text: string | null;
  landmarks: Array<{ role: string; accessibleName: string | null }>;
}

export interface Snapshot {
  focus: FocusInfo;
  dialogs: DialogInfo[];
  disclosures: DisclosureInfo[];
  liveRegionMutations: LiveRegionMutation[];
  contentMutations: ContentMutation[];
  invalidFields: FormFieldIssue[];
  errorSummaries: ErrorSummaryInfo[];
  page: PageInfo;
  ariaTree: string;
  capturedAt: number;
}
