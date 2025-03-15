import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

console.log(' Tentative de connexion à PostgreSQL avec TypeORM...');
console.log(' Tentative de connexion à MongoDB avec Mongoose...');

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
  ],
  exports: [PrismaModule],
})

export class DatabaseModule {}

console.log('🔌 MongoDB URI utilisé:', process.env.MONGO_URI);
