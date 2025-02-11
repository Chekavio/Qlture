import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Qlture API')
    .setDescription('Documentation de l\'API Qlture')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors({
    origin: '*', // 🔹 Permet à tout le monde d'accéder à ton API (pour les tests)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });
  
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, '0.0.0.0'); // ✅ Rend le serveur accessible sur le réseau local
  console.log(`🚀 Backend accessible sur : http://localhost:${PORT}`);
  console.log(`📚 Documentation Swagger disponible sur : http://localhost:${PORT}/api`);
  console.log('🔹 AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
  console.log('🔹 AUTH0_CLIENT_ID:', process.env.AUTH0_CLIENT_ID);
  console.log('🔹 AUTH0_CLIENT_SECRET:', process.env.AUTH0_CLIENT_SECRET ? '✔️ OK' : '❌ Manquant');

}
bootstrap();
