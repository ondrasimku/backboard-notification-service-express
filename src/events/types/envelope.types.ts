export type Envelope<T = unknown> = {
  event: string;
  source: string;
  id: string;
  data: T;
};

