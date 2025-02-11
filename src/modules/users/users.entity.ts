import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User {
  @ApiProperty({
    description: 'ID unique de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID Auth0 de l\'utilisateur',
    example: 'auth0|123456789'
  })
  @Column({ unique: true })
  auth0_id: string;

  @ApiProperty({
    description: 'Nom d\'utilisateur',
    example: 'johndoe'
  })
  @Column({ unique: true })
  username: string;

  @ApiProperty({
    description: 'Adresse email de l\'utilisateur',
    example: 'john.doe@example.com'
  })
  @Column({ unique: true })
  email: string;

  @ApiProperty({
    description: 'URL de l\'avatar de l\'utilisateur',
    example: 'https://example.com/avatar.jpg',
    required: false
  })
  @Column({ nullable: true })
  avatar_url: string;

  @ApiProperty({
    description: 'Date de création du compte',
    example: '2025-02-11T06:42:01Z'
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour du compte',
    example: '2025-02-11T06:42:01Z'
  })
  @UpdateDateColumn()
  updated_at: Date;
}
