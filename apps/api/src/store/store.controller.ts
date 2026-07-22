import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, CurrentUser, AuthUser } from '../auth/decorators';
import {
  CreatePlanDto,
  UpdatePlanDto,
  AddInventoryDto,
  CreateOrderDto,
  ReviewOrderDto,
} from './dto/store.dto';

@Controller()
export class StoreController {
  constructor(private readonly store: StoreService) {}

  // -------- public --------
  @Get('plans')
  listPlans() {
    return this.store.listPlans();
  }

  // -------- user --------
  @Post('orders')
  @UseGuards(JwtAuthGuard)
  createOrder(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.store.createOrder(user.id, dto);
  }

  @Get('orders/mine')
  @UseGuards(JwtAuthGuard)
  myOrders(@CurrentUser() user: AuthUser) {
    return this.store.myOrders(user.id);
  }

  // -------- admin --------
  @Get('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminPlans() {
    return this.store.adminListPlans();
  }

  @Post('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.store.createPlan(dto);
  }

  @Patch('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.store.updatePlan(id, dto);
  }

  @Post('admin/plans/:id/inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addInventory(@Param('id') id: string, @Body() dto: AddInventoryDto) {
    return this.store.addInventory(id, dto);
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminOrders(@Query('status') status?: string) {
    return this.store.adminListOrders(status);
  }

  @Post('admin/orders/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  reviewOrder(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUser,
    @Body() dto: ReviewOrderDto,
  ) {
    return this.store.reviewOrder(id, admin.id, dto);
  }
}
