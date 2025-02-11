import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../modules/users/users.entity';
import { Follower } from '../modules/followers/followers.entity';

console.log('📡 Tentative de connexion à PostgreSQL avec TypeORM...');

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [User, Follower],
      synchronize: true, // ❗ Désactiver en prod
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
      logging: true, // ✅ Active les logs TypeORM
    }),
  ],
})
export class DatabaseModule {}
