import { Query, Resolver } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { SystemService } from './system.service';
@Resolver()
export class SystemResolver {
  constructor(@Inject(SystemService) private readonly system: SystemService) {}
  @Query(() => String) apiVersion() {
    return this.system.version();
  }
}
