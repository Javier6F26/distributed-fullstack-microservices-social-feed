import { validate } from 'class-validator';
import { CreatePostDto } from './create-post.dto';

describe('CreatePostDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = new CreatePostDto();
    dto.title = 'Valid Title';
    dto.body = 'This is a valid body with enough characters.';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when title is less than 5 characters', async () => {
    const dto = new CreatePostDto();
    dto.title = 'Sho';  // 3 characters, less than minimum 5
    dto.body = 'This is a valid body with enough characters.';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail when title is more than 100 characters', async () => {
    const dto = new CreatePostDto();
    dto.title = 'a'.repeat(101);
    dto.body = 'This is a valid body with enough characters.';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should fail when body is less than 10 characters', async () => {
    const dto = new CreatePostDto();
    dto.title = 'Valid Title';
    dto.body = 'Short';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail when body is more than 5000 characters', async () => {
    const dto = new CreatePostDto();
    dto.title = 'Valid Title';
    dto.body = 'a'.repeat(5001);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should fail when title is empty', async () => {
    const dto = new CreatePostDto();
    dto.title = '';
    dto.body = 'This is a valid body with enough characters.';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail when body is empty', async () => {
    const dto = new CreatePostDto();
    dto.title = 'Valid Title';
    dto.body = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail when title is missing', async () => {
    const dto = new CreatePostDto();
    (dto as unknown as { title?: undefined }).title = undefined;
    dto.body = 'This is a valid body with enough characters.';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when body is missing', async () => {
    const dto = new CreatePostDto();
    dto.title = 'Valid Title';
    (dto as unknown as { body?: undefined }).body = undefined;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
