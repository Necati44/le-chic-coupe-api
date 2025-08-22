import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FirebaseAuthGuard } from 'src/auth/guards/firebase-auth.guard';
import { FinalizeProfileDto } from 'src/auth/dto/finalize-profile.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { logInfo } from '@common/logging/logger';
import { AllowSelf } from 'src/auth/decorators/allow-self.decorator';
import { DecodedIdToken } from 'firebase-admin/auth';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Post()
  // create(@Body() dto: CreateUserDto) {
  //   return this.usersService.create(dto);
  // }

  // L’utilisateur appelle ceci après le formulaire de finalisation
  @UseGuards(FirebaseAuthGuard)
  @Post('me/finalize')
  async finalize(@Body() dto: FinalizeProfileDto, @Req() req: any) {
    const decoded = (req.firebase ?? req.user) as DecodedIdToken | undefined;
    if (!decoded) throw new BadRequestException('missing_token');

    logInfo('users.finalize.start', { uid: decoded.uid, email: decoded.email });

    const existing = await this.usersService.findByFirebaseUid(decoded.uid);
    if (existing) {
      logInfo('users.finalize.already_done', { uid: decoded.uid, userId: existing.id });
      return { needsProfile: false, user: existing };   // ← pas d’exception
    }

    const user = await this.usersService.createFromFirebase(decoded.uid, decoded.email!, dto);
    logInfo('users.finalize.ok', { uid: decoded.uid, userId: user.id });
    return { needsProfile: false, user };
  }
  
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.STAFF)
  @Get()
  async findAll() {
    const list = await this.usersService.findAll();
    logInfo('users.findAll', { count: list.length });
    return this.usersService.findAll();
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @AllowSelf() // autorise GET /users/:id pour soi-même
  @Roles(Role.OWNER, Role.STAFF)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.appUser;
    logInfo('users.findOne', { byUserId: user?.id, targetId: id });
    return this.usersService.findOne(id);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @AllowSelf() // autorise PATCH /users/:id pour soi-même
  @Roles(Role.OWNER, Role.STAFF)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    const user = req.appUser;
    logInfo('users.update', { byUserId: user?.id, targetId: id, fields: Object.keys(dto || {}) });
    return this.usersService.update(id, dto);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @AllowSelf() // autorise DELETE /users/:id pour soi-même (RGPD)
  @Roles(Role.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const user = req.appUser;
    logInfo('users.remove', { byUserId: user?.id, targetId: id });
    return this.usersService.remove(id);
  }
}
