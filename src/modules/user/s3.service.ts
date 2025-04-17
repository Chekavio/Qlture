// src/aws/s3.service.ts
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
  } from '@aws-sdk/client-s3';
  import { Injectable } from '@nestjs/common';
  import { v4 as uuid } from 'uuid';
  import { extname } from 'path';
  
  @Injectable()
  export class S3Service {
    private readonly s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  
    private readonly bucket = process.env.AWS_S3_BUCKET_NAME!;
  
    async uploadUserAvatar(file: Express.Multer.File, userId: string): Promise<string> {
      const ext = extname(file.originalname);
      const key = `profile-pictures/${userId}/${uuid()}${ext}`;
  
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
  
      return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }
  
    async deleteObject(key: string): Promise<void> {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    }
  }
  