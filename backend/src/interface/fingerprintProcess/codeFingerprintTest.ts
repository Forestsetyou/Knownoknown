import Parser, { Query } from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';
import { Winnowing, CodeSimilarity, CodeScore } from './codeFingerprint.js';

const python_code1 = `
# 纯函数定义（保留原始逻辑）
def fibonacci(x):
    if x < 2:
        return x
    else:
        return fibonacci(x-1) + fibonacci(x-2)

# 纯函数调用
fibonacci_param = 10
fibonacci_result = fibonacci(fibonacci_param)  # 函数调用节点

# 类定义（新增面向对象结构）
class FibonacciCalculator:
    # 类变量
    MAX_INPUT = 1000  

    def __init__(self):
        # 实例变量
        self.memo = {}  
        self.call_count = 0

    # 类方法（带缓存的优化版）
    def calculate(self, x):
        self.call_count += 1
        if x in self.memo:
            return self.memo[x]
        if x < 2:
            result = x
        else:
            result = self.calculate(x-1) + self.calculate(x-2)
        self.memo[x] = result
        return result

    # 静态方法
    @staticmethod
    def validate(x):
        return isinstance(x, int) and x >= 0

# 类实例化与调用
calculator = FibonacciCalculator()  # 类构造节点
if FibonacciCalculator.validate(fibonacci_param):  # 静态方法调用
    optimized_result = calculator.calculate(fibonacci_param)  # 实例方法调用
`;

const python_code2 = `
def fibonacci(x):
        if x < 2:  # 如果x小于2，返回x
            return x
        else:

            return fibonacci(x-1) + fibonacci(x-2)  # 否则返回fibonacci(x-1)和fibonacci(x-2)的和

fibonacci_param = 10  # 设置参数


fibonacci_result = fibonacci(fibonacci_param)  # 计算结果
`;

const js_code = `
// 纯函数
function fibonacci(x) {
    if (x < 2) return x;
    return fibonacci(x - 1) + fibonacci(x - 2);
}

// 函数调用
const fibonacciParam = 10;
const fibonacciResult = fibonacci(fibonacciParam);

// 类定义
class FibonacciCalculator {
    static MAX_INPUT = 1000; // 静态成员变量

    constructor() {
        this.memo = {};      // 实例成员变量
        this.callCount = 0;  // 方法调用计数器
    }

    // 实例方法（带缓存优化）
    calculate(x) {
        this.callCount++;
        if (x in this.memo) return this.memo[x];
        if (x < 2) return x;
        const res = this.calculate(x - 1) + this.calculate(x - 2);
        this.memo[x] = res;
        return res;
    }

    // 静态方法
    static validate(x) {
        return Number.isInteger(x) && x >= 0;
    }
}

// 类实例化与调用
const calculator = new FibonacciCalculator();
if (FibonacciCalculator.validate(fibonacciParam)) {
    const optimizedResult = calculator.calculate(fibonacciParam);
}
`
const js_code2 = `
function sequenceSum(n) {
    if (n < 2) return n;
    return sequenceSum(n - 1) + sequenceSum(n - 2);
}
// 函数调用
const inputNum = 10;
const outputValue = sequenceSum(inputNum);
// 类定义
class SeriesComputer {
    static UPPER_LIMIT = 1000; // 静态成员变量
    constructor() {
        this.cache = {};       // 实例成员变量
        this.invokeTimes = 0;  // 方法调用计数器
    }
    // 实例方法（带缓存优化）
    compute(n) {
        this.invokeTimes++;
        if (n in this.cache) return this.cache[n];
        if (n < 2) return n;
        const val = this.compute(n - 1) + this.compute(n - 2);
        this.cache[n] = val;
        return val;
    }
    // 静态方法
    static checkValid(n) {
        return Number.isInteger(n) && n > -1;
    }
}
// 类实例化与调用
const processor = new SeriesComputer();
if (SeriesComputer.checkValid(inputNum)) {
    const cachedResult = processor.compute(inputNum);
}
`
const cpp_code = `
#include <iostream>
#include <unordered_map>
using namespace std;

// 纯函数
int fibonacci(int x) {
    if (x < 2) return x;
    return fibonacci(x - 1) + fibonacci(x - 2);
}

// 类定义
class FibonacciCalculator {
public:
    static const int MAX_INPUT = 1000; // 静态常量

    FibonacciCalculator() : callCount(0) {} // 构造函数初始化

    // 实例方法
    int calculate(int x) {
        callCount++;
        if (memo.find(x) != memo.end()) return memo[x];
        if (x < 2) return x;
        int res = calculate(x - 1) + calculate(x - 2);
        memo[x] = res;
        return res;
    }

    // 静态方法
    static bool validate(int x) {
        return x >= 0;
    }

private:
    unordered_map<int, int> memo; // 成员变量
    int callCount;
};

int main() {
    // 纯函数调用
    int fibonacciParam = 10;
    int fibonacciResult = fibonacci(fibonacciParam);

    // 类实例化与调用
    FibonacciCalculator calculator;
    if (FibonacciCalculator::validate(fibonacciParam)) {
        int optimizedResult = calculator.calculate(fibonacciParam);
    }

    return 0;
}
`;
const c_code = `
#include <stdio.h>
#include <stdlib.h>

// 纯函数（C不支持默认参数）
int fibonacci(int x) {
    if (x < 2) return x;
    return fibonacci(x - 1) + fibonacci(x - 2);
}

// 结构体模拟类
typedef struct {
    int* memo;       // 缓存数组（简化实现）
    int memoSize;
    int callCount;   // 调用计数器
} FibonacciCalculator;

// 初始化"类"
void FibonacciCalculator_init(FibonacciCalculator* calc) {
    calc->memo = (int*)malloc(100 * sizeof(int));
    calc->memoSize = 100;
    calc->callCount = 0;
}

// "类方法"
int FibonacciCalculator_calculate(FibonacciCalculator* calc, int x) {
    calc->callCount++;
    if (x < calc->memoSize && calc->memo[x] != 0) {
        return calc->memo[x];
    }
    if (x < 2) return x;
    int res = FibonacciCalculator_calculate(calc, x - 1) + 
              FibonacciCalculator_calculate(calc, x - 2);
    if (x < calc->memoSize) calc->memo[x] = res;
    return res;
}

// "静态方法"
int FibonacciCalculator_validate(int x) {
    return x >= 0;
}

int main() {
    // 纯函数调用
    int fibonacciParam = 10;
    int fibonacciResult = fibonacci(fibonacciParam);

    // "类"实例化与调用
    FibonacciCalculator calc;
    FibonacciCalculator_init(&calc);
    if (FibonacciCalculator_validate(fibonacciParam)) {
        int optimizedResult = FibonacciCalculator_calculate(&calc, fibonacciParam);
    }

    free(calc.memo); // 释放内存
    return 0;
}
`
const java_code = `
public class Main {
    // 纯函数实现
    public static int fibonacci(int x) {
        if (x < 2) return x;
        return fibonacci(x - 1) + fibonacci(x - 2);
    }

    // 面向对象实现
    static class FibonacciCalculator {
        // 静态常量
        public static final int MAX_INPUT = 1000;

        // 实例变量
        private final java.util.HashMap<Integer, Integer> memo = new java.util.HashMap<>();
        private int callCount = 0;

        // 实例方法（带缓存优化）
        public int calculate(int x) {
            callCount++;
            if (memo.containsKey(x)) return memo.get(x);
            if (x < 2) return x;
            int res = calculate(x - 1) + calculate(x - 2);
            memo.put(x, res);
            return res;
        }

        // 静态方法
        public static boolean validate(int x) {
            return x >= 0;
        }
    }

    public static void main(String[] args) {
        // 纯函数调用
        int fibonacciParam = 10;
        int fibonacciResult = fibonacci(fibonacciParam);

        // 类实例化与方法调用
        FibonacciCalculator calculator = new FibonacciCalculator();
        if (FibonacciCalculator.validate(fibonacciParam)) {
            int optimizedResult = calculator.calculate(fibonacciParam);
            System.out.println("Optimized result: " + optimizedResult);
        }
    }
}
`

// const fp1 = Winnowing(python_code1, 'python');
// const fp2 = Winnowing(python_code2, 'python');
// const [sim] = CodeSimilarity(fp1, fp2);
// const score = CodeScore(sim);
// console.log(score);
const fp1 = Winnowing(js_code, 'javascript');
const fp2 = Winnowing(js_code2, 'javascript');
const [sim] = CodeSimilarity(fp1, fp2);
const score = CodeScore(sim);
// console.log(`"js_code.js"指纹: ${fp1}`);
// console.log(`"js_code2.js"指纹: ${fp2}`);
console.log(`相似度: ${sim}, 得分: ${score}`);

// Winnowing(cpp_code, 'cpp');

// Winnowing(c_code, 'c');

// Winnowing(java_code, 'java');
