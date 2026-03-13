# Tests Unitarios para Servicios Backend

Esta documentación describe los tests unitarios implementados para los servicios backend de la arquitectura de microservicios NestJS + MongoDB.

## Resumen Ejecutivo

| Servicio                        | Tests | Estado                     | Cobertura                                                         |
|---------------------------------|-------|----------------------------|-------------------------------------------------------------------|
| `UsersService`                  | 14    | ✅ Todos passing            | findById, findByEmail, getProfile, updateProfile, bulkCreateUsers |
| `AuthService`                   | 11    | ✅ 10 passing  (1 skipped)  | register, login, validateUser, logout                             |
| `PostsService`                  | 15    | ✅ Todos passing            | findOne, findAll, updatePost, deletePost, bulkCreatePosts         |
| `CommentsService`               | 14    | ✅ Todos passing            | findOne, updateComment, deleteComment, bulkCreateComments         |
| `AuthService` (API Gateway)     | 4     | ✅ Todos passing            | validateToken                                                     |
| `RabbitmqService` (API Gateway) | 8     | ✅ Todos passing            | publishPostCreate, publishCommentCreate                           |

**Total: 66 tests (65 passing, 1 skipped)**

---

## Estructura de Tests

### Patrón de Testing

Todos los tests siguen el patrón **AAA (Arrange-Act-Assert)**:

```typescript
it('[P0] should return user when found by id', async () => {
  // Arrange - Preparar datos y mocks
  const mockUser = { _id: '123', username: 'testuser', email: 'test@example.com' };
  mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) } as any);

  // Act - Ejecutar la acción
  const result = await usersService.findById('123');

  // Assert - Verificar resultados
  expect(result).toEqual(mockUser);
  expect(mockUserModel.findById).toHaveBeenCalledWith('123');
});
```

### Sistema de Prioridades

Cada test incluye una etiqueta de prioridad en su descripción:

- **[P0]**: Crítico - Happy path, funcionalidad principal
- **[P1]**: Alto - Casos de error, validaciones
- **[P2]**: Medio - Casos borde, escenarios menos comunes
- **[P3]**: Bajo - Casos raros, optimizaciones

---

## Tests por Servicio

### 1. UsersService (`user-service`)

**Archivo:** `user-service/src/app/users/users.service.spec.ts`

#### Tests Implementados

| Test | Prioridad | Descripción |
|------|-----------|-------------|
| `findById - should return user when found` | P0 | Busca usuario por ID exitosamente |
| `findById - should return null when not found` | P2 | Retorna null si no existe |
| `findByEmail - should return user when found` | P0 | Busca usuario por email exitosamente |
| `findByEmail - should return null when not found` | P2 | Retorna null si email no existe |
| `findByUsername - should return user when found` | P0 | Busca usuario por username exitosamente |
| `findByUsername - should return null when not found` | P2 | Retorna null si username no existe |
| `getProfile - should return profile without password` | P0 | Retorna perfil sin passwordHash |
| `getProfile - should throw NotFoundException` | P1 | Lanza excepción si usuario no existe |
| `updateProfile - should update successfully` | P0 | Actualiza perfil correctamente |
| `updateProfile - should throw NotFoundException` | P1 | Lanza excepción si usuario no existe |
| `bulkCreateUsers - should create users successfully` | P0 | Crea múltiples usuarios exitosamente |
| `bulkCreateUsers - should skip duplicate emails` | P1 | Saltea emails duplicados |
| `bulkCreateUsers - should skip duplicate usernames` | P1 | Saltea usernames duplicados |
| `bulkCreateUsers - should handle insert errors` | P2 | Maneja errores de inserción gracefulmente |

#### Ejemplo de Test

```typescript
describe('getProfile', () => {
  it('[P0] should return user profile without password', async () => {
    // Arrange
    const mockUser = {
      _id: new Types.ObjectId().toString(),
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date('2024-01-01'),
    } as UserDocument;
    
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      }),
    } as any);

    // Act
    const result = await usersService.getProfile(mockUser._id.toString());

    // Assert
    expect(result).toEqual({
      _id: mockUser._id.toString(),
      username: mockUser.username,
      email: mockUser.email,
      createdAt: mockUser.createdAt,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
```

---

### 2. AuthService (`user-service`)

**Archivo:** `user-service/src/app/auth/auth.service.spec.ts`

#### Tests Implementados

| Test | Prioridad | Descripción |
|------|-----------|-------------|
| `register - should register user successfully` | P0 | Registra usuario exitosamente |
| `register - should throw ConflictException (email)` | P1 | Rechaza email duplicado |
| `register - should throw ConflictException (username)` | P1 | Rechaza username duplicado |
| `login - should login with email successfully` | P0 | Login con email exitoso |
| `login - should throw UnauthorizedException (not found)` | P1 | Usuario no encontrado |
| `login - should throw UnauthorizedException (inactive)` | P1 | Cuenta desactivada |
| `login - should throw UnauthorizedException (invalid password)` | P1 | Password inválido |
| `validateUser - should return user data when active` | P0 | Valida usuario activo |
| `validateUser - should return null when not found` | P2 | Usuario no encontrado |
| `validateUser - should return null when inactive` | P2 | Usuario inactivo |
| `logout - should logout successfully` | P0 | Logout exitoso |

#### Ejemplo de Test

```typescript
describe('login', () => {
  it('[P0] should login user successfully with email', async () => {
    // Arrange
    const loginDto = { identifier: 'test@example.com', password: 'password123' };
    const user = {
      _id: new Types.ObjectId(),
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      isActive: true,
    };
    const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

    mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) } as any);
    mockJwtService.signAsync.mockResolvedValue(tokens.accessToken);
    mockRefreshTokenService.generateRefreshToken.mockResolvedValue({ refreshToken: tokens.refreshToken } as any);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Act
    const result = await authService.login(loginDto);

    // Assert
    expect(result.user.username).toBe('testuser');
    expect(result.accessToken).toBe('access-token');
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
  });
});
```

---

### 3. PostsService (`post-service`)

**Archivo:** `post-service/src/app/posts/posts.service.spec.ts`

#### Tests Implementados

| Test | Prioridad | Descripción |
|------|-----------|-------------|
| `findOne - should return post when found` | P0 | Busca post por ID exitosamente |
| `findOne - should return null when not found` | P2 | Retorna null si no existe |
| `findOne - should throw BadRequestException (invalid ID)` | P1 | ID inválido |
| `findAll - should return posts with pagination` | P0 | Lista posts con paginación |
| `findAll - should return null nextCursor` | P0 | No hay más posts |
| `findAll - should throw BadRequestException (invalid cursor)` | P1 | Cursor inválido |
| `updatePost - should update successfully` | P0 | Actualiza post correctamente |
| `updatePost - should throw NotFoundException` | P1 | Post no encontrado |
| `updatePost - should throw BadRequestException (invalid ID)` | P1 | ID inválido |
| `deletePost - should soft delete successfully` | P0 | Elimina post (soft delete) |
| `deletePost - should throw NotFoundException` | P1 | Post ya eliminado |
| `bulkCreatePosts - should create posts successfully` | P0 | Crea múltiples posts |
| `bulkCreatePosts - should skip duplicate posts` | P1 | Saltea posts duplicados |
| `bulkCreatePosts - should skip invalid authorId` | P1 | Saltea authorId inválido |
| `bulkCreatePosts - should handle insert errors` | P2 | Maneja errores de inserción |

#### Ejemplo de Test

```typescript
describe('bulkCreatePosts', () => {
  it('[P0] should create posts successfully', async () => {
    // Arrange
    const postsData = [
      { authorId: new Types.ObjectId().toString(), author: 'Author 1', title: 'Post 1', body: 'Content 1' },
      { authorId: new Types.ObjectId().toString(), author: 'Author 2', title: 'Post 2', body: 'Content 2' },
    ];
    const createdPosts = [
      { _id: new Types.ObjectId(), authorId: postsData[0].authorId, title: 'Post 1', author: 'Author 1' },
      { _id: new Types.ObjectId(), authorId: postsData[1].authorId, title: 'Post 2', author: 'Author 2' },
    ];

    mockPostModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
    mockPostModel.insertMany.mockResolvedValue(createdPosts as any);

    // Act
    const result = await postsService.bulkCreatePosts(postsData);

    // Assert
    expect(result.created).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
```

---

### 4. CommentsService (`comment-service`)

**Archivo:** `comment-service/src/app/comments/comments.service.spec.ts`

#### Tests Implementados

| Test | Prioridad | Descripción |
|------|-----------|-------------|
| `findOne - should return comment when found` | P0 | Busca comentario por ID |
| `findOne - should return null when not found` | P2 | Retorna null si no existe |
| `findOne - should return null for invalid ID` | P2 | ID inválido |
| `findByPostId - should return recent comments` | P0 | Lista comentarios de un post |
| `findByPostId - should handle invalid postId` | P0 | Maneja postId inválido |
| `updateComment - should update successfully` | P0 | Actualiza comentario |
| `updateComment - should throw NotFoundException` | P1 | Comentario no encontrado |
| `deleteComment - should delete successfully` | P0 | Elimina comentario |
| `deleteComment - should throw NotFoundException` | P1 | Comentario no encontrado |
| `bulkCreateComments - should create successfully` | P0 | Crea múltiples comentarios |
| `bulkCreateComments - should skip duplicates` | P1 | Saltea duplicados |
| `bulkCreateComments - should skip invalid postId` | P1 | Saltea postId inválido |
| `bulkCreateComments - should skip empty authorId` | P1 | Saltea authorId vacío |
| `bulkCreateComments - should handle insert errors` | P2 | Maneja errores de inserción |

#### Ejemplo de Test

```typescript
describe('updateComment', () => {
  it('[P0] should update comment successfully', async () => {
    // Arrange
    const commentId = new Types.ObjectId().toString();
    const updates = { body: 'Updated comment' };
    const updatedComment = {
      _id: new Types.ObjectId(commentId),
      postId: new Types.ObjectId(),
      body: 'Updated comment',
    };
    
    mockCommentModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedComment),
    } as any);
    
    mockCommentModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any);

    // Act
    const result = await commentsService.updateComment(commentId, updates);

    // Assert
    expect(result.body).toBe('Updated comment');
    expect(mockCommentModel.findByIdAndUpdate).toHaveBeenCalledWith(
      commentId,
      updates,
      { new: true, timestamps: false },
    );
  });
});
```

---

### 5. AuthService - API Gateway (`api-gateway`)

**Archivo:** `api-gateway/src/app/auth/auth.service.spec.ts`

#### Tests Implementados

| Test | Prioridad | Descripción |
|------|-----------|-------------|
| `validateToken - should return user data when valid` | P0 | Valida token exitosamente |
| `validateToken - should return null when invalid` | P1 | Token inválido |
| `validateToken - should return null when service unavailable` | P1 | Servicio no disponible |
| `validateToken - should use default URL when not configured` | P2 | Usa URL por defecto |

#### Ejemplo de Test

```typescript
describe('validateToken', () => {
  it('[P0] should return user data when token is valid', async () => {
    // Arrange
    const accessToken = 'valid-token-123';
    const mockUserData = { _id: '123', username: 'testuser' };
    mockConfigService.get.mockReturnValue('http://localhost:3001');
    mockHttpService.get.mockReturnValue(of({ data: mockUserData }) as any);

    // Act
    const result = await authService.validateToken(accessToken);

    // Assert
    expect(result).toEqual(mockUserData);
    expect(mockHttpService.get).toHaveBeenCalledWith(
      'http://localhost:3001/auth/validate',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer valid-token-123',
        },
      }),
    );
  });
});
```

---

### 6. RabbitmqService - API Gateway (`api-gateway`)

**Archivo:** `api-gateway/src/app/rabbitmq/rabbitmq.service.spec.ts`

#### Tests Implementados

| Test | Prioridad | Descripción |
|------|-----------|-------------|
| `publishPostCreate - should publish successfully` | P0 | Publica mensaje de post |
| `publishPostCreate - should handle error gracefully` | P1 | Maneja error de publicación |
| `publishPostCreate - should include all fields` | P0 | Incluye todos los campos |
| `publishCommentCreate - should publish successfully` | P0 | Publica mensaje de comentario |
| `publishCommentCreate - should handle error gracefully` | P1 | Maneja error de publicación |
| `publishCommentCreate - should include all fields` | P0 | Incluye todos los campos |
| `onModuleInit - should connect on init` | P0 | Conecta al iniciar módulo |
| `onModuleInit - should use default URI` | P2 | Usa URI por defecto |

#### Ejemplo de Test

```typescript
describe('publishPostCreate', () => {
  it('[P0] should publish message to POST_CREATE_QUEUE successfully', async () => {
    // Arrange
    const message = {
      tempId: 'temp-123',
      userId: 'user-456',
      author: 'Test Author',
      title: 'Test Post',
      body: 'Test content',
      createdAt: new Date(),
    };
    mockPostClient.emit.mockReturnValue(of({}) as any);

    // Act
    const result = rabbitmqService.publishPostCreate(message);

    // Assert
    expect(result).toBeDefined();
    expect(mockPostClient.emit).toHaveBeenCalledWith(POST_CREATE_QUEUE, message);
  });
});
```

---

## Configuración de Mocks

### Mock de Modelo Mongoose

```typescript
mockUserModel = {
  findOne: jest.fn() as any,
  findById: jest.fn() as any,
  findByIdAndUpdate: jest.fn() as any,
  insertMany: jest.fn() as any,
} as jest.Mocked<Model<UserDocument>>;
```

### Mock de Métodos Encadenados

Para métodos que usan chaining (`.find().sort().limit().exec()`):

```typescript
mockCommentModel.find.mockReturnValue({
  sort: jest.fn().mockReturnValue({
    limit: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
  }),
} as any);
```

### Mock de bcrypt

```typescript
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-123'),
  compare: jest.fn().mockResolvedValue(true),
}));
```

---

## Ejecución de Tests

### Correr todos los tests de un servicio

```bash
# User Service
npx nx test user-service

# Post Service
npx nx test post-service

# Comment Service
npx nx test comment-service
```

### Correr un archivo específico

```bash
npx nx test user-service --testFile=users.service.spec.ts
```

### Correr tests con watch mode

```bash
npx nx test user-service --watch
```

---

## Cobertura de Tests

Para generar reporte de cobertura:

```bash
npx nx test user-service --coverage
```

Los reportes se generan en:
- `test-output/jest/coverage/`

---

## Mejores Prácticas Aplicadas

### 1. **Aislamiento Total**
- Todos los dependencies externos están mockeados
- No hay llamadas reales a MongoDB
- No hay llamadas a servicios externos

### 2. **Tests Determinísticos**
- Los mocks siempre retornan valores predecibles
- No hay dependencias de estado externo
- Cada test es independiente

### 3. **Nomenclatura Clara**
- Describe el comportamiento esperado
- Incluye prioridad [P0], [P1], [P2]
- Formato: `[P0] should <action> when <condition>`

### 4. **Cobertura de Casos**
- ✅ Happy path (P0)
- ✅ Casos de error (P1)
- ✅ Casos borde (P2)
- ✅ Validaciones de entrada

### 5. **Mocks Realistas**
- Estructura de datos similar a producción
- Tipos de retorno correctos
- Chaining de métodos soportado

---

## Integración con CI/CD

Los tests se ejecutan automáticamente en:

1. **Pre-commit**: Validación rápida
2. **Pull Request**: Verificación completa
3. **Merge a main**: Validación final

### Comandos en CI

```yaml
# Ejemplo GitHub Actions
- name: Run Unit Tests
  run: |
    npx nx test user-service
    npx nx test post-service
    npx nx test comment-service
```

---

## Solución de Problemas Comunes

### Error: "Cannot read properties of undefined (reading 'exec')"

**Causa:** El mock no está configurado correctamente para métodos encadenados.

**Solución:**
```typescript
// ❌ Incorrecto
mockUserModel.findOne.mockResolvedValue(user);

// ✅ Correcto
mockUserModel.findOne.mockReturnValue({
  exec: jest.fn().mockResolvedValue(user),
} as any);
```

### Error: "Mock cleared between tests"

**Causa:** `jest.clearAllMocks()` limpia las implementaciones.

**Solución:** Re-configurar mocks en cada test o usar `mockClear()` en lugar de `clearAllMocks()`.

### Error: "Expected N arguments, got M"

**Causa:** El mock no recibe los parámetros correctos.

**Solución:** Verificar que los mocks están configurados con los parámetros correctos:
```typescript
mockUserModel.create.mockResolvedValue(createdUser as any);
expect(mockUserModel.create).toHaveBeenCalledWith(expect.objectContaining({
  username: 'testuser',
  email: 'test@example.com',
}));
```

---

## Recursos Adicionales

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing MongoDB with Mongoose](https://mongoosejs.com/docs/jest.html)

---

## Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-03-13 | 1.1.0 | Tests para API Gateway: AuthService (4), RabbitmqService (8) |
| 2026-03-13 | 1.0.0 | Tests iniciales para UsersService, AuthService, PostsService, CommentsService |
