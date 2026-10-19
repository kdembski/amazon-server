export interface SearchPhrase {
  text: string;
  wordStart: boolean;
  wordEnd: boolean;
}

export interface ParsedSearchRule {
  include: SearchPhrase[][];
  exclude: SearchPhrase[];
}
