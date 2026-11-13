export type KnowledgeType = "note" | "document" | "meeting" | "transcript";

export interface KnowledgeItem {
  id: string;
  title: string;
  type: KnowledgeType;
  content: string;
  summary: string;
  collectionId: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  participants?: string[];
  decisions?: string[];
  actionItems?: string[];
  relatedKnowledgeIds?: string[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: "default" | "success" | "warning" | "danger";
}

export type ViewId =
  | "home"
  | "all"
  | "notes"
  | "documents"
  | "meetings"
  | "transcripts"
  | "favorites"
  | "recent"
  | `collection:${string}`;
