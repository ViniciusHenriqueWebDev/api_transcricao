"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const Company_1 = __importDefault(require("./Company"));
const PerformanceCampaign_1 = __importDefault(require("./PerformanceCampaign"));
const EmployeeGoal_1 = __importDefault(require("./EmployeeGoal"));
let Goal = class Goal extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Goal.prototype, "id", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Goal.prototype, "name", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Goal.prototype, "description", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Goal.prototype, "metricType", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Goal.prototype, "target", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Goal.prototype, "current", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], Goal.prototype, "startDate", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], Goal.prototype, "endDate", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Goal.prototype, "reward", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Goal.prototype, "rewardValue", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Goal.prototype, "rewardStatus", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], Goal.prototype, "multiEmployee", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], Goal.prototype, "dividedGoal", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Goal.prototype, "originalTarget", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Goal.prototype, "totalEmployees", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => PerformanceCampaign_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Goal.prototype, "performanceCampaignId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => PerformanceCampaign_1.default),
    __metadata("design:type", PerformanceCampaign_1.default)
], Goal.prototype, "performanceCampaign", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Goal.prototype, "companyId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Company_1.default),
    __metadata("design:type", Company_1.default)
], Goal.prototype, "company", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ARRAY(sequelize_typescript_1.DataType.INTEGER)
    }),
    __metadata("design:type", Array)
], Goal.prototype, "employees", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => EmployeeGoal_1.default),
    __metadata("design:type", Array)
], Goal.prototype, "employeeGoals", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Goal.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Goal.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], Goal.prototype, "productConfig", void 0);
Goal = __decorate([
    sequelize_typescript_1.Table
], Goal);
exports.default = Goal;
