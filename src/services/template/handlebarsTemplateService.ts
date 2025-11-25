import { injectable, inject } from 'inversify';
import * as handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ILogger } from '../../logging/logger.interface';
import { TYPES } from '../../types/di.types';
import { ITemplateService } from './templateService.interface';

@injectable()
export class HandlebarsTemplateService implements ITemplateService {
  private readonly templatesDir: string;
  private templateCache: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(
    @inject(TYPES.Logger) private readonly logger: ILogger
  ) {
    this.templatesDir = join(process.cwd(), 'src', 'templates');
  }

  async renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
    try {
      let template = this.templateCache.get(templateName);

      if (!template) {
        const templatePath = join(this.templatesDir, templateName);
        const templateContent = await readFile(templatePath, 'utf-8');
        template = handlebars.compile(templateContent);
        this.templateCache.set(templateName, template);
      }

      return template(data);
    } catch (error) {
      this.logger.error('Failed to render template', error as Error, {
        templateName,
      });
      throw error;
    }
  }
}

