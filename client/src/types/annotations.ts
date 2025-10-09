export interface AnnotationUser {
  id: number;
  username: string;
  role: "ADMIN" | "EDITOR" | "READER";
}

export interface AnnotationReply {
  id: number;
  policyVersionId: number;
  userId: number;
  content: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  user: AnnotationUser;
}

export interface AnnotationThread extends AnnotationReply {
  replies: AnnotationReply[];
}

export interface CreateAnnotationPayload {
  policyVersionId: number;
  content: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
}
