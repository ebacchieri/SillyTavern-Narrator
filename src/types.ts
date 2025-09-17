export interface NEntry {
  uid: number;
  key: string[];
  keysecondary?: string[];
  content: string;
  comment: string;
  scan_depth?: number;
  selective?: boolean;
  enabled?: boolean;
  disable?: boolean;
}
