import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  ParseUUIDPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, UpdateDescriptionDto, UpdateUsernameDto, UpdateProfileDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { IUser } from '../../common/interfaces/user.interface';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { IsUserOwnerGuard } from './guards/is-user-owner.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: CreateUserDto })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
  })
  findAll() {
    return this.userService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@CurrentUser() user: { sub: string }) {
    return this.userService.findById(user.sub);
  }

  @Get(':id/basic')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get user basic info by ID' })
  @ApiResponse({ status: 200, description: 'User basic info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID'
  })
  getUserBasicInfo(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserBasicInfo(id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID'
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID'
  })
  @ApiBody({ type: UpdateUserDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/description')
  @UseGuards(JwtAuthGuard, IsUserOwnerGuard)
  @ApiOperation({
    summary: 'Update user description',
    description: 'Update the bio or description of the current user. Maximum length is 500 characters.'
  })
  @ApiResponse({
    status: 200,
    description: 'Description updated successfully',
    type: UpdateDescriptionDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only update your own description'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input (e.g. description too long)'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID'
  })
  async updateDescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDescriptionDto: UpdateDescriptionDto
  ): Promise<IUser> {
    return this.userService.updateDescription(id, updateDescriptionDto.description);
  }

  @Patch(':id/username')
  @UseGuards(JwtAuthGuard, IsUserOwnerGuard)
  @ApiOperation({
    summary: 'Update username',
    description: 'Change the username of the current user. Username must be unique and at least 3 characters long.'
  })
  @ApiResponse({
    status: 200,
    description: 'Username updated successfully',
    type: UpdateUsernameDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only update your own username'
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Username already taken'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input (e.g. username too short)'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID'
  })
  async updateUsername(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUsernameDto: UpdateUsernameDto
  ): Promise<IUser> {
    return this.userService.updateUsername(id, updateUsernameDto.username);
  }

  @Patch(':id/avatar')
  @UseGuards(JwtAuthGuard, IsUserOwnerGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update profile picture',
    description: 'Upload a new profile picture. Accepts JPG, JPEG, or PNG files up to 5MB in size.'
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar updated successfully'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only update your own avatar'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid file type or size'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture file (JPG, JPEG, or PNG, max 5MB)'
        }
      }
    }
  })
  async updateAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<IUser> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.userService.updateAvatar(id, file);
  }

  @Patch(':id/profile')
  @UseGuards(JwtAuthGuard, IsUserOwnerGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update a user\'s profile information. You can update username, avatar file, and/or description. All fields are optional.'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UpdateProfileDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only update your own profile'
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Username already taken'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input (e.g. username too short, description too long, invalid file type)'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'New username (min 3 characters)',
          example: 'johndoe123'
        },
        description: {
          type: 'string',
          description: 'User bio or description (max 500 characters)',
          example: 'Hi! I love reading science fiction and fantasy books.'
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture file (JPG, JPEG, or PNG, max 5MB)'
        }
      }
    }
  })
  async updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false
      })
    )
    avatar?: Express.Multer.File,
  ): Promise<IUser> {
    return this.userService.updateProfile(id, updateProfileDto, avatar);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID'
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.remove(id);
  }
}
