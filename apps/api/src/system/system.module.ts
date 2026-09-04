import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemResolver } from './system.resolver';
import { SystemService } from './system.service';
@Module({ controllers: [SystemController], providers: [SystemResolver, SystemService] }) export class SystemModule {}
