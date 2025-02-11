import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
export class Follower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @Column()
  follower_id: string; // Celui qui suit

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @Column()
  following_id: string; // Celui qui est suivi

  @CreateDateColumn()
  followed_at: Date;
}
