export interface ITemplateService {
  renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string>;
}

