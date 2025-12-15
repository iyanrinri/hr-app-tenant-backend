import { ApiProperty } from '@nestjs/swagger';

export class UploadProfilePictureResponseDto {
  @ApiProperty({ example: 'http://localhost:3000/uploads/profiles/1702345678901-profile.jpg' })
  url: string;

  @ApiProperty({ example: '1702345678901-profile.jpg' })
  filename: string;

  @ApiProperty({ example: 'Profile picture uploaded successfully' })
  message: string;
}
