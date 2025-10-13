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
const User_1 = __importDefault(require("./User"));
const Goal_1 = __importDefault(require("./Goal"));
const Employee_1 = __importDefault(require("./Employee"));
const Company_1 = __importDefault(require("./Company"));
let AuditLog = class AuditLog extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], AuditLog.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User_1.default),
    __metadata("design:type", User_1.default)
], AuditLog.prototype, "user", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], AuditLog.prototype, "userName", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], AuditLog.prototype, "ip", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], AuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Goal_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], AuditLog.prototype, "goalId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Goal_1.default),
    __metadata("design:type", Goal_1.default)
], AuditLog.prototype, "goal", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], AuditLog.prototype, "goalName", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Employee_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], AuditLog.prototype, "employeeId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Employee_1.default),
    __metadata("design:type", Employee_1.default)
], AuditLog.prototype, "employee", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], AuditLog.prototype, "employeeName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.FLOAT),
    __metadata("design:type", Number)
], AuditLog.prototype, "oldValue", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.FLOAT),
    __metadata("design:type", Number)
], AuditLog.prototype, "newValue", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], AuditLog.prototype, "changeType", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], AuditLog.prototype, "justification", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], AuditLog.prototype, "metricType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.FLOAT),
    __metadata("design:type", Number)
], AuditLog.prototype, "individualTarget", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], AuditLog.prototype, "companyId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Company_1.default),
    __metadata("design:type", Company_1.default)
], AuditLog.prototype, "company", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AuditLog.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], AuditLog.prototype, "updatedAt", void 0);
AuditLog = __decorate([
    sequelize_typescript_1.Table
], AuditLog);
exports.default = AuditLog;
