import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const port = process.env.PORT ?? '5000';
  const serverUrl =
    process.env.APP_URL?.replace(/\/$/, '') ?? `http://localhost:${port}`;

  const config = new DocumentBuilder()
    .setTitle('Health Bridge API')
    .setDescription('Health Bridge backend API documentation')
    .setVersion('1.0')
    .addServer(serverUrl, 'Current environment')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
  });
}
