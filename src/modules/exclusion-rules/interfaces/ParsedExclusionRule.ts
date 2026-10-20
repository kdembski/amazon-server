export interface SearchPhrase {
  text: string;
  wordStart: boolean;
  wordEnd: boolean;
}

export interface ParsedExclusionRule {
  include: SearchPhrase[][];
  exclude: SearchPhrase[];
}
