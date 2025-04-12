import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
    // Enable validation pipes
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    
  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Qlture API')
    .setDescription('Documentation de l\'API Qlture')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('profile', 'Profile management endpoints')
    .addTag('search', 'Recherche de contenus')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for references
    )
    .addOAuth2({
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scopes: {
            email: 'View your email address',
            profile: 'View your basic profile info',
          },
        },
      },
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Enable CORS with credentials
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

    // Enable cookie parser
    app.use(cookieParser());

  
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, '0.0.0.0'); // ✅ Rend le serveur accessible sur le réseau local
  console.log(`🚀 Backend accessible sur : http://localhost:${PORT}`);
  console.log(`📚 Documentation Swagger disponible sur : http://localhost:${PORT}/api`);
  console.log('🔹 AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
  console.log('🔹 AUTH0_CLIENT_ID:', process.env.AUTH0_CLIENT_ID);
  console.log('🔹 AUTH0_CLIENT_SECRET:', process.env.AUTH0_CLIENT_SECRET ? '✔️ OK' : '❌ Manquant');

}
bootstrap();
